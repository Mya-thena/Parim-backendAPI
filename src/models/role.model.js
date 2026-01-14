const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    roleName: {
      type: String,
      required: true,
      trim: true
    },
    roleDescription: {
      type: String, // Made optional in doc, but keeping structure.
      required: false
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    duration: {
      type: String, // e.g. "5hrs"
      required: false
    },
    filledSlots: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Index for efficient queries
roleSchema.index({ eventId: 1 });
roleSchema.index({ roleName: 1 });

// Virtual to check if role is full
roleSchema.virtual('isFull').get(function () {
  return this.filledSlots >= this.capacity;
});

module.exports = mongoose.model("Role", roleSchema);
