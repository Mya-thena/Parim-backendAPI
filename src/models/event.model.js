const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true
    },
    longDescription: {
      type: String,
      required: true
    },
    bannerImage: {
      type: String,
      required: false // Optional for now, or true if mandatory
    },
    eventDate: {
      start: {
        type: Date,
        required: true
      },
      end: {
        type: Date,
        required: true
      }
    },
    location: {
      address: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      }
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'], // Removed in_progress/completed/cancelled to match simple logic
      default: 'draft'
    },
    qrCode: {
      type: String,
      required: false // Sprint 2: No QR yet
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
eventSchema.index({ "eventDate.start": 1 }); // Updated field path
eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Event", eventSchema);