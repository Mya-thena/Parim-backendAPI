const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true
    },
    checkInTime: {
      type: Date,
      default: null
    },
    checkOutTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['not_checked_in', 'qr_verified', 'supervisor_verified', 'completed', 'absent', 'late'],
      default: 'not_checked_in'
    },
    qrVerified: {
      type: Boolean,
      default: false
    },
    qrVerifiedAt: {
      type: Date,
      default: null
    },
    supervisorVerified: {
      type: Boolean,
      default: false
    },
    supervisorVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    supervisorVerifiedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ""
    },
    isLate: {
      type: Boolean,
      default: false
    },
    lateMinutes: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Compound index for unique attendance per event per user
attendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });
attendanceSchema.index({ eventId: 1, status: 1 });
attendanceSchema.index({ userId: 1, checkInTime: 1 });

// Method to mark QR verification
attendanceSchema.methods.markQRVerified = function() {
  this.qrVerified = true;
  this.qrVerifiedAt = new Date();
  this.status = 'qr_verified';
  return this.save();
};

// Method to mark supervisor verification
attendanceSchema.methods.markSupervisorVerified = function(supervisorId) {
  this.supervisorVerified = true;
  this.supervisorVerifiedBy = supervisorId;
  this.supervisorVerifiedAt = new Date();
  this.status = 'supervisor_verified';
  return this.save();
};

// Method to check in
attendanceSchema.methods.checkIn = function() {
  this.checkInTime = new Date();
  this.status = 'qr_verified';
  this.qrVerified = true;
  this.qrVerifiedAt = new Date();
  return this.save();
};

// Method to check out
attendanceSchema.methods.checkOut = function() {
  this.checkOutTime = new Date();
  this.status = 'completed';
  return this.save();
};

// Method to mark as absent
attendanceSchema.methods.markAbsent = function(notes = "") {
  this.status = 'absent';
  this.notes = notes;
  return this.save();
};

module.exports = mongoose.model("Attendance", attendanceSchema);