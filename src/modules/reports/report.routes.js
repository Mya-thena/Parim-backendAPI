const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting and Analytics
 */

/**
 * @swagger
 * /api/reports/events/{eventId}/attendance:
 *   get:
 *     summary: Get attendance report
 *     tags: [Reports]
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
 *         description: Report retrieved
 */
router.get(
    '/events/:eventId/attendance',
    protect,
    restrictTo('admin'),
    reportController.getAttendanceReport
);

/**
 * @swagger
 * /api/reports/events/{eventId}/attendance/csv:
 *   get:
 *     summary: Export attendance report as CSV
 *     tags: [Reports]
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
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
    '/events/:eventId/attendance/csv',
    protect,
    restrictTo('admin'),
    reportController.exportAttendanceCSV
);

/**
 * @swagger
 * /api/reports/events/{eventId}/attendance/pdf:
 *   get:
 *     summary: Export attendance report as PDF
 *     tags: [Reports]
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
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get(
    '/events/:eventId/attendance/pdf',
    protect,
    restrictTo('admin'),
    reportController.exportAttendancePDF
);

module.exports = router;
