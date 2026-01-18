const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

// Calculate Payments (Admin)
router.post(
    '/calculate/:eventId',
    protect,
    restrictTo('admin'),
    paymentController.calculatePayments
);

// Get Event Payments (Admin)
router.get(
    '/events/:eventId',
    protect,
    restrictTo('admin'),
    paymentController.getEventPayments
);

// Approve Payment (Admin)
router.patch(
    '/:paymentId/approve',
    protect,
    restrictTo('admin'),
    paymentController.approvePayment
);

// Mark as Paid (Admin)
router.patch(
    '/:paymentId/paid',
    protect,
    restrictTo('admin'),
    paymentController.markAsPaid
);

// My Earnings (Staff)
router.get(
    '/my-earnings',
    protect,
    paymentController.getMyEarnings
);

module.exports = router;
