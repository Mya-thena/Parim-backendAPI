const mongoose = require("mongoose");

const attendanceOverrideSchema = new mongoose.Schema(
    {
        attendanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
            required: true,
            index: true
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        action: {
            type: String,
            enum: ['CHECK_IN_OVERRIDE', 'CHECK_OUT_OVERRIDE', 'MARK_ABSENT', 'STATUS_CHANGE'],
            required: true
        },
        reason: {
            type: String,
            required: true,
            minlength: 10
        },
        before: {
            status: String,
            checkIn: {
                time: Date,
                method: String,
                verifiedBy: mongoose.Schema.Types.ObjectId
            },
            checkOut: {
                time: Date,
                method: String,
                verifiedBy: mongoose.Schema.Types.ObjectId
            }
        },
        after: {
            status: String,
            checkIn: {
                time: Date,
                method: String,
                verifiedBy: mongoose.Schema.Types.ObjectId
            },
            checkOut: {
                time: Date,
                method: String,
                verifiedBy: mongoose.Schema.Types.ObjectId
            }
        },
        ipAddress: {
            type: String,
            required: false // Future enhancement
        }
    },
    { timestamps: true }
);

// Indexes for audit trail queries
attendanceOverrideSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AttendanceOverride", attendanceOverrideSchema);
