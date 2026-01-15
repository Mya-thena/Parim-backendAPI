const express = require('express');
const router = express.Router();

const qrController = require('./qr.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

// ==========================================
// QR CODE ROUTES (Admin Only)
// ==========================================

// Generate QR Code for Event
router.post(
    '/generate',
    protect,
    restrictTo('admin'),
    qrController.generateQRCode
);

// Get Active QR Code for Event
router.get(
    '/event/:eventId',
    protect,
    restrictTo('admin'),
    qrController.getActiveQRCode
);

// Deactivate QR Code
router.delete(
    '/:qrId',
    protect,
    restrictTo('admin'),
    qrController.deactivateQRCode
);

module.exports = router;
