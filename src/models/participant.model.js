const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
            required: true
        },
        // Snapshots
        roleName: {
            type: String,
            required: true
        },
        rolePrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['applied', 'approved', 'rejected', 'cancelled'],
            default: 'applied'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Indexes
participantSchema.index({ eventId: 1, staffId: 1 }, { unique: true }); // Prevent double application per event
participantSchema.index({ eventId: 1, roleId: 1 });
participantSchema.index({ staffId: 1 });

module.exports = mongoose.model("Participant", participantSchema);
