const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
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
    currentParticipants: {
      type: Number,
      default: 0
    },
    requiredTraining: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Training"
    }],
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Index for efficient queries
roleSchema.index({ eventId: 1 });
roleSchema.index({ title: 1 });
roleSchema.index({ "participants.userId": 1 });

// Virtual to check if role is full
roleSchema.virtual('isFull').get(function() {
  return this.currentParticipants >= this.capacity;
});

// Method to add participant
roleSchema.methods.addParticipant = function(userId) {
  if (this.currentParticipants >= this.capacity) {
    throw new Error('Role capacity is full');
  }
  
  // Check if user already exists
  const existingParticipant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    throw new Error('User already added to this role');
  }
  
  this.participants.push({ userId });
  this.currentParticipants += 1;
  return this.save();
};

// Method to remove participant
roleSchema.methods.removeParticipant = function(userId) {
  const participantIndex = this.participants.findIndex(
    p => p.userId.toString() === userId.toString()
  );
  
  if (participantIndex === -1) {
    throw new Error('User not found in this role');
  }
  
  this.participants.splice(participantIndex, 1);
  this.currentParticipants -= 1;
  return this.save();
};

module.exports = mongoose.model("Role", roleSchema);
