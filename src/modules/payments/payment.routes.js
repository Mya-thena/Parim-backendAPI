const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment calculation and management
 */

/**
 * @swagger
 * /api/payments/calculate/{eventId}:
 *   post:
 *     summary: Calculate payments for an event (Admin)
 *     tags: [Payments]
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
 *         description: Payments calculated successfully
 */
router.post(
    '/calculate/:eventId',
    protect,
    restrictTo('admin'),
    paymentController.calculatePayments
);

/**
 * @swagger
 * /api/payments/events/{eventId}:
 *   get:
 *     summary: Get payments for an event
 *     tags: [Payments]
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
 *         description: Payment list retrieved
 */
router.get(
    '/events/:eventId',
    protect,
    restrictTo('admin'),
    paymentController.getEventPayments
);

/**
 * @swagger
 * /api/payments/{paymentId}/approve:
 *   patch:
 *     summary: Approve a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment approved
 */
router.patch(
    '/:paymentId/approve',
    protect,
    restrictTo('admin'),
    paymentController.approvePayment
);

/**
 * @swagger
 * /api/payments/{paymentId}/paid:
 *   patch:
 *     summary: Mark a payment as paid
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment marked as paid
 */
router.patch(
    '/:paymentId/paid',
    protect,
    restrictTo('admin'),
    paymentController.markAsPaid
);

/**
 * @swagger
 * /api/payments/my-earnings:
 *   get:
 *     summary: Get my earnings (Staff)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings retrieved
 */
router.get(
    '/my-earnings',
    protect,
    paymentController.getMyEarnings
);

module.exports = router;
