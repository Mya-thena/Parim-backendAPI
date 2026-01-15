const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'CHECKED_IN', 'ACTIVE', 'COMPLETED', 'ABSENT'],
      default: 'ASSIGNED',
      index: true
    },
    checkIn: {
      time: {
        type: Date,
        default: null
      },
      method: {
        type: String,
        enum: ['qr', 'manual', 'override'],
        default: null
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      location: {
        type: String,
        default: null // Optional GPS coordinates for future
      }
    },
    checkOut: {
      time: {
        type: Date,
        default: null
      },
      method: {
        type: String,
        enum: ['qr', 'manual', 'override'],
        default: null
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      }
    },
    overridden: {
      type: Boolean,
      default: false,
      index: true
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Compound index for unique attendance per event per staff
attendanceSchema.index({ eventId: 1, staffId: 1 }, { unique: true });
attendanceSchema.index({ eventId: 1, status: 1 });
attendanceSchema.index({ staffId: 1, createdAt: -1 });

// Virtual to calculate duration
attendanceSchema.virtual('duration').get(function () {
  if (this.checkIn.time && this.checkOut.time) {
    const diff = this.checkOut.time - this.checkIn.time;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hours ${minutes} minutes`;
  }
  return null;
});

// Method to perform check-in
attendanceSchema.methods.performCheckIn = function (method = 'qr', verifiedBy = null) {
  // Validate state transition
  if (this.status !== 'ASSIGNED') {
    throw new Error('Can only check-in from ASSIGNED status');
  }

  this.checkIn.time = new Date();
  this.checkIn.method = method;
  this.checkIn.verifiedBy = verifiedBy;
  this.status = 'ACTIVE'; // Direct to ACTIVE
  return this.save();
};

// Method to perform check-out
attendanceSchema.methods.performCheckOut = function (method = 'qr', verifiedBy = null) {
  // Validate state transition
  if (this.status !== 'ACTIVE' && this.status !== 'CHECKED_IN') {
    throw new Error('Can only check-out from ACTIVE or CHECKED_IN status');
  }

  this.checkOut.time = new Date();
  this.checkOut.method = method;
  this.checkOut.verifiedBy = verifiedBy;
  this.status = 'COMPLETED';
  return this.save();
};

// Method to mark as absent (admin only)
attendanceSchema.methods.markAbsent = function (notes = "") {
  this.status = 'ABSENT';
  this.notes = notes;
  this.overridden = true;
  return this.save();
};

// Method to get snapshot for audit trail
attendanceSchema.methods.getSnapshot = function () {
  return {
    status: this.status,
    checkIn: {
      time: this.checkIn.time,
      method: this.checkIn.method,
      verifiedBy: this.checkIn.verifiedBy
    },
    checkOut: {
      time: this.checkOut.time,
      method: this.checkOut.method,
      verifiedBy: this.checkOut.verifiedBy
    }
  };
};

// Enable virtuals in JSON
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Attendance", attendanceSchema);