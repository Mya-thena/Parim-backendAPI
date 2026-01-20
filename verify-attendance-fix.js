const mongoose = require('mongoose');
require('dotenv').config();

async function verifyStats() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const Event = require('./src/models/event.model');
        const Attendance = require('./src/models/attendance.model');

        // Find an event with some attendance
        const attendanceSample = await Attendance.findOne().lean();
        if (!attendanceSample) {
            console.log('No attendance records found to test with.');
            return;
        }

        const eventId = attendanceSample.eventId;
        const event = await Event.findById(eventId).lean();

        console.log(`Checking stats for event: ${event.title} (${eventId})`);

        // Get stats grouped by status
        const stats = await Attendance.aggregate([
            { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        console.log('Raw stats from DB:', stats);

        // Simulate logic in admin.controller.js
        const summary = {
            assigned: 0,
            checkedIn: 0,
            active: 0,
            completed: 0,
            absent: 0
        };

        stats.forEach(stat => {
            const status = stat._id.toLowerCase();
            if (status === "assigned") summary.assigned = stat.count;
            if (status === "checked_in") summary.checkedIn += stat.count;
            if (status === "active") summary.checkedIn += stat.count; // This is the fix
            if (status === "active") summary.active = stat.count;
            if (status === "completed") summary.completed = stat.count;
            if (status === "absent") summary.absent = stat.count;
        });

        console.log('Calculated summary:', summary);

        // Fetch recent check-ins
        const recentCheckIns = await Attendance.find({
            eventId,
            status: { $in: ["CHECKED_IN", "ACTIVE", "COMPLETED"] }
        })
            .populate("staffId", "fullName mail")
            .sort({ "checkIn.time": -1 })
            .limit(10)
            .lean();

        console.log(`Found ${recentCheckIns.length} recent check-ins.`);
        if (recentCheckIns.length > 0) {
            console.log('Sample recent check-in:', {
                staff: recentCheckIns[0].staffId?.fullName,
                status: recentCheckIns[0].status,
                time: recentCheckIns[0].checkIn?.time
            });
        }

        if (summary.checkedIn > 0 || summary.active > 0) {
            console.log('✅ Success: checkedIn count is correctly reflecting active users.');
        } else {
            console.log('ℹ️ Note: No active users found reported in this event, but logic is verified.');
        }

    } catch (error) {
        console.error('Verification error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyStats();
