const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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

    // Staff-specific fields
    staffId: {
      type: String,
      unique: true,
      sparse: true // Allows multiple nulls
    },

    // Profile information
    profilePicture: {
      type: String,
      default: ""
    },

    dateOfBirth: {
      type: Date,
      default: null
    },

    address: {
      type: String,
      default: ""
    },

    // Verification status
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

    // OTP fields
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
    }],

    // Staff-specific settings
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },

    // Training completion tracking
    completedTrainings: [{
      trainingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Training"
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Emergency contact
    emergencyContact: {
      name: String,
      relationship: String,
      phoneNumber: String
    }
  },
  { timestamps: true }
);

// Index for efficient queries
// userSchema.index({ mail: 1 }); // Already unique
// userSchema.index({ staffId: 1 }); // Already unique/sparse
userSchema.index({ isActive: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ "refreshTokens.token": 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to generate staff ID
userSchema.pre('save', async function () {
  if (this.isNew && !this.staffId) {
    // Find the user with the highest staffId
    const lastUser = await this.constructor.findOne({}, { staffId: 1 })
      .sort({ staffId: -1 })
      .lean();

    let nextNumber = 1;
    if (lastUser && lastUser.staffId) {
      // Extract number from STFXXXXXX
      const lastNumber = parseInt(lastUser.staffId.replace('STF', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    this.staffId = `STF${String(nextNumber).padStart(6, '0')}`;
  }
});

// Method to add refresh token
userSchema.methods.addRefreshToken = function (token, deviceInfo, ipAddress) {
  // Remove expired tokens
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());

  // Add new token (expires in 7 days for staff)
  this.refreshTokens.push({
    token,
    deviceInfo,
    ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  return this.save();
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Method to clear all refresh tokens
userSchema.methods.clearAllRefreshTokens = function () {
  this.refreshTokens = [];
  return this.save();
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 1 hour
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 1 * 60 * 60 * 1000 }; // 1 hour
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Method to check if training is completed
userSchema.methods.hasCompletedTraining = function (trainingId) {
  return this.completedTrainings.some(
    ct => ct.trainingId.toString() === trainingId.toString()
  );
};

// Method to mark training as completed
userSchema.methods.completeTraining = function (trainingId) {
  if (this.hasCompletedTraining(trainingId)) {
    return this; // Already completed
  }

  this.completedTrainings.push({ trainingId });
  return this.save();
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function (mail, password) {
  const user = await this.findOne({ mail, isActive: true });
  if (!user) return null;

  // Check if account is locked
  if (user.isLocked) return null;

  const isMatch = await require('bcrypt').compare(password, user.password);
  if (!isMatch) {
    await user.incLoginAttempts();
    return null;
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();
  return user;
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
