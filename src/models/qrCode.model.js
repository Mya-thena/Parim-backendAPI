const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        token: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Indexes for efficient queries
qrCodeSchema.index({ eventId: 1 });

// Method to check if QR is expired
qrCodeSchema.methods.isExpired = function () {
    return new Date() > this.expiresAt;
};

// Method to deactivate QR
qrCodeSchema.methods.deactivate = function () {
    this.isActive = false;
    return this.save();
};

module.exports = mongoose.model("QRCode", qrCodeSchema);
