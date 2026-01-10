const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['calculated', 'pending', 'approved', 'paid', 'rejected'],
      default: 'calculated'
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: {
      type: Date,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paystack', 'cash'],
      default: 'bank_transfer'
    },
    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String
    },
    notes: {
      type: String,
      default: ""
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    workHours: {
      type: Number,
      required: true
    },
    hourlyRate: {
      type: Number,
      required: true
    },
    deductions: {
      type: Number,
      default: 0
    },
    bonuses: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for efficient queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ eventId: 1, status: 1 });
paymentSchema.index({ status: 1, calculatedAt: 1 });
paymentSchema.index({ approvedBy: 1 });

// Virtual for total amount (amount - deductions + bonuses)
paymentSchema.virtual('totalAmount').get(function() {
  return this.amount - this.deductions + this.bonuses;
});

// Method to approve payment
paymentSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;
  return this.save();
};

// Method to mark as paid
paymentSchema.methods.markPaid = function(paymentMethod = 'bank_transfer') {
  this.status = 'paid';
  this.paidAt = new Date();
  this.paymentMethod = paymentMethod;
  return this.save();
};

// Method to reject payment
paymentSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  return this.save();
};

// Static method to calculate earnings for attendance
paymentSchema.statics.calculateEarnings = function(attendanceId, hourlyRate, workHours) {
  const amount = hourlyRate * workHours;
  
  return this.create({
    attendanceId,
    amount,
    hourlyRate,
    workHours,
    status: 'calculated'
  });
};

// Static method to get pending payments
paymentSchema.statics.getPendingPayments = function() {
  return this.find({ status: 'pending' })
    .populate('userId', 'fullName mail')
    .populate('eventId', 'title eventDate')
    .populate('roleId', 'title');
};

// Static method to get user payment history
paymentSchema.statics.getUserPaymentHistory = function(userId) {
  return this.find({ userId })
    .populate('eventId', 'title eventDate')
    .populate('roleId', 'title')
    .sort({ calculatedAt: -1 });
};

module.exports = mongoose.model("Payment", paymentSchema);
