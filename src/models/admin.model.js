const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    mail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    phoneNumber: {
      type: String,
      required: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['super_admin', 'admin', 'event_manager'],
      default: 'admin'
    },

    permissions: [{
      type: String,
      enum: [
        'create_events',
        'edit_events',
        'delete_events',
        'manage_staff',
        'approve_payments',
        'view_reports',
        'manage_training',
        'system_settings'
      ]
    }],

    isVerified: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLogin: {
      type: Date,
      default: null
    },

    loginAttempts: {
      type: Number,
      default: 0
    },

    lockUntil: {
      type: Date,
      default: null
    },

    otp: String,
    otpExpiresAt: Date,
    otpAttempts: {
      type: Number,
      default: 0
    },

    // Refresh tokens for session management
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: Date,
      deviceInfo: String,
      ipAddress: String
    }]
  },
  { timestamps: true }
);

// Index for efficient queries
adminSchema.index({ mail: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ "refreshTokens.token": 1 });

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method to add refresh token
adminSchema.methods.addRefreshToken = function(token, deviceInfo, ipAddress) {
  // Remove expired tokens
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
  
  // Add new token (expires in 30 days)
  this.refreshTokens.push({
    token,
    deviceInfo,
    ipAddress,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
  
  return this.save();
};

// Method to remove refresh token
adminSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Method to clear all refresh tokens
adminSchema.methods.clearAllRefreshTokens = function() {
  this.refreshTokens = [];
  return this.save();
};

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Method to check permissions
adminSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === 'super_admin';
};

// Static method to find by credentials
adminSchema.statics.findByCredentials = async function(mail, password) {
  const admin = await this.findOne({ mail, isActive: true });
  if (!admin) return null;
  
  // Check if account is locked
  if (admin.isLocked) return null;
  
  const isMatch = await require('bcrypt').compare(password, admin.password);
  if (!isMatch) {
    await admin.incLoginAttempts();
    return null;
  }
  
  // Reset login attempts on successful login
  await admin.resetLoginAttempts();
  return admin;
};

module.exports = mongoose.model("Admin", adminSchema);
