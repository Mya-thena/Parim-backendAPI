const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    uniqueId: {
      type: String,
      unique: true,
      index: true
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
      venue: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true,
        index: true
      }
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
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

// Auto-generate Unique ID
eventSchema.pre('save', async function () {
  if (!this.uniqueId) {
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.uniqueId = `EVT-${random}`;
  }
});

// Index for efficient queries
eventSchema.index({ "eventDate.start": 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });
// eventSchema.index({ uniqueId: 1 }); // Already defined in field definition

module.exports = mongoose.model("Event", eventSchema);