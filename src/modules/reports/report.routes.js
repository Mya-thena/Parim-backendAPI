const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

// Attendance Summary
router.get(
    '/events/:eventId/attendance',
    protect,
    restrictTo('admin'),
    reportController.getAttendanceReport
);

// Export CSV
router.get(
    '/events/:eventId/attendance/csv',
    protect,
    restrictTo('admin'),
    reportController.exportAttendanceCSV
);

// Export PDF
router.get(
    '/events/:eventId/attendance/pdf',
    protect,
    restrictTo('admin'),
    reportController.exportAttendancePDF
);

module.exports = router;
