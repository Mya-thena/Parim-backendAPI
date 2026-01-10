const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    eventDate: {
      type: Date,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
      default: 'draft'
    },
    qrCode: {
      type: String,
      required: true
    },
    maxParticipants: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    }]
  },
  { timestamps: true }
);

// Index for efficient queries
eventSchema.index({ eventDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Event", eventSchema);