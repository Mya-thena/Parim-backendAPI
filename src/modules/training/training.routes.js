const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const trainingController = require('./training.controller');
const { protect, restrictTo } = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * tags:
 *   name: Training
 *   description: Training module endpoints
 */

/**
 * @swagger
 *       201:
 *         description: Training created successfully
 */
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

/**
 * @swagger
 * /api/training:
 *   get:
 *     summary: Get all training content
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trainings
 */
router.get(
    '/',
    protect,
    restrictTo('admin'),
    trainingController.getAllTrainings
);

/**
 * @swagger
 * /api/training/assign:
 *   post:
 *     summary: Assign training to event
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - trainingId
 *             properties:
 *               eventId:
 *                 type: string
 *               trainingId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Training assigned successfully
 */
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

/**
 * @swagger
 * /api/training/events/{eventId}:
 *   get:
 *     summary: Get trainings assigned to an event
 *     tags: [Training]
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
 *         description: List of trainings
 */
router.get(
    '/events/:eventId',
    protect,
    trainingController.getEventTrainings
);

/**
 * @swagger
 * /api/training/{trainingId}:
 *   delete:
 *     summary: Soft delete training
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trainingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Training deleted successfully
 */
router.delete(
    '/:trainingId',
    protect,
    restrictTo('admin'),
    trainingController.deleteTraining
);

module.exports = router;
