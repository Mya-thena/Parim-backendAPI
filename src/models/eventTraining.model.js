const mongoose = require("mongoose");

// Bridge collection: One training <--> Many events
const eventTrainingSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        trainingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Training",
            required: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        assignedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Prevent duplicate assignments
eventTrainingSchema.index({ eventId: 1, trainingId: 1 }, { unique: true });

module.exports = mongoose.model("EventTraining", eventTrainingSchema);
