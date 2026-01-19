const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and overview
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 */
router.get(
    '/stats',
    protect,
    restrictTo('admin'),
    dashboardController.getDashboardStats
);

/**
 * @swagger
 * /api/dashboard/staff-stats:
 *   get:
 *     summary: Get staff dashboard stats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff dashboard stats retrieved
 */
router.get(
    '/staff-stats',
    protect,
    restrictTo('user'),
    dashboardController.getStaffDashboardStats
);

module.exports = router;
