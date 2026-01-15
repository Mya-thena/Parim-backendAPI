const express = require('express');
const router = express.Router();

const attendanceController = require('./attendance.controller');
const adminController = require('./admin.controller');
const qrRoutes = require('./qr.routes');

const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

// ==========================================
// QR CODE ROUTES (prefix: /api/attendance/qr)
// ==========================================
router.use('/qr', qrRoutes);

// ==========================================
// STAFF ATTENDANCE ROUTES
// ==========================================

// Check-in
router.post(
    '/check-in',
    protect,
    restrictTo('user'), // Staff only
    attendanceController.checkIn
);

// Check-out
router.post(
    '/check-out',
    protect,
    restrictTo('user'), // Staff only
    attendanceController.checkOut
);

// Get My Attendance Status for Event
router.get(
    '/my-status/:eventId',
    protect,
    restrictTo('user'), // Staff only
    attendanceController.getMyStatus
);

// ==========================================
// ADMIN ATTENDANCE ROUTES (prefix: /api/attendance/admin)
// ==========================================

// Get Live Attendance Statistics
router.get(
    '/admin/events/:eventId/live',
    protect,
    restrictTo('admin'),
    adminController.getLiveStats
);

// Get Detailed Attendance List
router.get(
    '/admin/events/:eventId/details',
    protect,
    restrictTo('admin'),
    adminController.getAttendanceDetails
);

// Override Attendance
router.post(
    '/admin/:attendanceId/override',
    protect,
    restrictTo('admin'),
    adminController.overrideAttendance
);

// Get Override History
router.get(
    '/admin/:attendanceId/overrides',
    protect,
    restrictTo('admin'),
    adminController.getOverrideHistory
);

module.exports = router;
