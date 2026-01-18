const express = require('express');
const router = express.Router();

const attendanceController = require('./attendance.controller');
const adminController = require('./admin.controller');
const qrRoutes = require('./qr.routes');

const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance tracking and management
 */

// ==========================================
// QR CODE ROUTES (prefix: /api/attendance/qr)
// ==========================================
router.use('/qr', qrRoutes);

// ==========================================
// STAFF ATTENDANCE ROUTES
// ==========================================

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Check-in to event via QR
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrToken
 *             properties:
 *               qrToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check-in successful
 */
router.post(
    '/check-in',
    protect,
    restrictTo('user'), // Staff only
    attendanceController.checkIn
);

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Check-out from event via QR
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrToken
 *             properties:
 *               qrToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check-out successful
 */
router.post(
    '/check-out',
    protect,
    restrictTo('user'), // Staff only
    attendanceController.checkOut
);

/**
 * @swagger
 * /api/attendance/my-status/{eventId}:
 *   get:
 *     summary: Get my attendance status for an event
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance status retrieved
 */
router.get(
    '/my-status/:eventId',
    protect,
    restrictTo('user'), // Staff only
    attendanceController.getMyStatus
);

// ==========================================
// ADMIN ATTENDANCE ROUTES (prefix: /api/attendance/admin)
// ==========================================

/**
 * @swagger
 * /api/attendance/admin/events/{eventId}/live:
 *   get:
 *     summary: Get live attendance statistics
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live statistics retrieved
 */
router.get(
    '/admin/events/:eventId/live',
    protect,
    restrictTo('admin'),
    adminController.getLiveStats
);

/**
 * @swagger
 * /api/attendance/admin/events/{eventId}/details:
 *   get:
 *     summary: Get detailed attendance list
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance list retrieved
 */
router.get(
    '/admin/events/:eventId/details',
    protect,
    restrictTo('admin'),
    adminController.getAttendanceDetails
);

/**
 * @swagger
 * /api/attendance/admin/{attendanceId}/override:
 *   post:
 *     summary: Override attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attendanceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - reason
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [CHECK_IN_OVERRIDE, CHECK_OUT_OVERRIDE, MARK_ABSENT, STATUS_CHANGE]
 *               reason:
 *                 type: string
 *               checkInTime:
 *                 type: string
 *                 format: date-time
 *               checkOutTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Override successful
 */
router.post(
    '/admin/:attendanceId/override',
    protect,
    restrictTo('admin'),
    adminController.overrideAttendance
);

/**
 * @swagger
 * /api/attendance/admin/{attendanceId}/overrides:
 *   get:
 *     summary: Get override history
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attendanceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Override history retrieved
 */
router.get(
    '/admin/:attendanceId/overrides',
    protect,
    restrictTo('admin'),
    adminController.getOverrideHistory
);

module.exports = router;
