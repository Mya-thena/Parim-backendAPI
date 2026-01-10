const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema(
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
    videoUrl: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // in minutes
      required: true
    },
    category: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    completions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      completedAt: {
        type: Date,
        default: Date.now
      },
      completionPercentage: {
        type: Number,
        default: 100
      }
    }]
  },
  { timestamps: true }
);

// Index for efficient queries
trainingSchema.index({ category: 1 });
trainingSchema.index({ isActive: 1 });
trainingSchema.index({ "completions.userId": 1 });

// Method to mark training as completed by user
trainingSchema.methods.markCompleted = function(userId) {
  // Check if user already completed this training
  const existingCompletion = this.completions.find(
    c => c.userId.toString() === userId.toString()
  );
  
  if (existingCompletion) {
    return this; // Already completed
  }
  
  this.completions.push({ 
    userId, 
    completedAt: new Date(),
    completionPercentage: 100
  });
  
  return this.save();
};

// Method to check if user has completed training
trainingSchema.methods.isUserCompleted = function(userId) {
  return this.completions.some(
    completion => completion.userId.toString() === userId.toString()
  );
};

// Static method to get user's completed trainings
trainingSchema.statics.getUserCompletedTrainings = function(userId) {
  return this.find({
    "completions.userId": userId
  });
};

// Static method to get required trainings for role
trainingSchema.statics.getRequiredTrainings = function(trainingIds) {
  return this.find({
    _id: { $in: trainingIds },
    isActive: true
  });
};

module.exports = mongoose.model("Training", trainingSchema);
