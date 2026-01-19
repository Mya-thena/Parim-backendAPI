const Event = require('../../models/event.model');
const Attendance = require('../../models/attendance.model');
const Payment = require('../../models/payment.model');
const User = require('../../models/user.model');
const Admin = require('../../models/admin.model');

/**
 * @desc    Get dashboard stats for admin
 * @route   GET /api/dashboard/stats
 * @access  Admin
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Get recent events
        const recentEvents = await Event.find({ 
            createdBy: adminId, 
            isDeleted: false 
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'fullName mail')
        .populate({
            path: 'roles',
            match: { isActive: true, isDeleted: false },
            select: 'roleName price capacity'
        });

        // Get all events for stats
        const allEvents = await Event.find({ 
            createdBy: adminId, 
            isDeleted: false 
        });

        // Get attendance stats
        const eventIds = allEvents.map(e => e._id);
        const attendanceStats = await Attendance.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get payment stats
        const paymentStats = await Payment.aggregate([
            { $match: { eventId: { $in: eventIds } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: { $toDouble: '$amount' } }
                }
            }
        ]);

        // Get total staff/users
        const totalStaff = await User.countDocuments({ isActive: true });

        // Process stats
        const eventStats = {
            total: allEvents.length,
            published: allEvents.filter(e => e.status === 'published').length,
            draft: allEvents.filter(e => e.status === 'draft').length,
            closed: allEvents.filter(e => e.status === 'closed').length
        };

        const attendanceSummary = {
            total: 0,
            assigned: 0,
            active: 0,
            checkedIn: 0,
            completed: 0,
            absent: 0
        };

        attendanceStats.forEach(stat => {
            const key = stat._id.toLowerCase();
            if (key === 'checked_in') {
                attendanceSummary.checkedIn = stat.count;
            } else if (attendanceSummary.hasOwnProperty(key)) {
                attendanceSummary[key] = stat.count;
            }
            attendanceSummary.total += stat.count;
        });

        const paymentSummary = {
            calculated: 0,
            approved: 0,
            paid: 0,
            totalAmount: 0
        };

        paymentStats.forEach(stat => {
            paymentSummary[stat._id] = stat.count;
            if (stat._id === 'paid') {
                paymentSummary.totalAmount = stat.totalAmount;
            }
        });

        // Calculate attendance rate
        const attendanceRate = attendanceSummary.total > 0 
            ? ((attendanceSummary.completed / attendanceSummary.total) * 100).toFixed(1)
            : '0';

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalEvents: eventStats.total,
                    activeEvents: eventStats.published,
                    totalStaff,
                    attendanceRate: `${attendanceRate}%`
                },
                events: {
                    stats: eventStats,
                    recent: recentEvents
                },
                attendance: attendanceSummary,
                payments: paymentSummary
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

/**
 * @desc    Get dashboard stats for staff
 * @route   GET /api/dashboard/staff-stats
 * @access  Staff
 */
exports.getStaffDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get my attendance records
        const myAttendances = await Attendance.find({ staffId: userId })
            .populate('eventId', 'title eventDate status')
            .populate('roleId', 'roleName price')
            .sort({ createdAt: -1 });

        // Get my payments
        const myPayments = await Payment.find({ userId })
            .populate('eventId', 'title')
            .sort({ createdAt: -1 });

        // Calculate stats
        const attendanceStats = {
            total: myAttendances.length,
            completed: myAttendances.filter(a => a.status === 'COMPLETED').length,
            active: myAttendances.filter(a => a.status === 'ACTIVE').length,
            checkedIn: myAttendances.filter(a => a.status === 'CHECKED_IN').length
        };

        const paymentStats = {
            total: myPayments.length,
            paid: myPayments.filter(p => p.status === 'paid').length,
            pending: myPayments.filter(p => p.status === 'approved').length,
            totalEarnings: myPayments
                .filter(p => p.status === 'paid')
                .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
        };

        // Get upcoming events
        const upcomingEvents = await Event.find({ 
            status: 'published',
            isDeleted: false,
            'eventDate.start': { $gte: new Date() }
        })
        .sort({ 'eventDate.start': 1 })
        .limit(3);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalAssignments: attendanceStats.total,
                    completedAssignments: attendanceStats.completed,
                    totalEarnings: paymentStats.totalEarnings.toFixed(2),
                    upcomingEvents: upcomingEvents.length
                },
                attendance: attendanceStats,
                payments: paymentStats,
                recentActivity: {
                    attendances: myAttendances.slice(0, 5),
                    payments: myPayments.slice(0, 5)
                },
                upcomingEvents
            }
        });

    } catch (error) {
        console.error('Staff Dashboard Stats Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: error.message 
        });
    }
};
