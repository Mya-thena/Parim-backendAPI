const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const trainingController = require('./training.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

// Create Training (Admin only)
router.post(
    '/',
    protect,
    restrictTo('admin'),
    [
        check('title', 'Title is required').not().isEmpty(),
        check('description', 'Description is required').not().isEmpty(),
        check('youtubeUrl', 'YouTube URL is required').not().isEmpty()
    ],
    trainingController.createTraining
);

// Assign Training (Admin only)
router.post(
    '/assign',
    protect,
    restrictTo('admin'),
    [
        check('eventId', 'Event ID is required').not().isEmpty(),
        check('trainingId', 'Training ID is required').not().isEmpty()
    ],
    trainingController.assignTraining
);

// Get Event Trainings (Staff/Admin)
router.get(
    '/events/:eventId',
    protect,
    trainingController.getEventTrainings
);

// Delete Training (Admin only)
router.delete(
    '/:trainingId',
    protect,
    restrictTo('admin'),
    trainingController.deleteTraining
);

module.exports = router;
