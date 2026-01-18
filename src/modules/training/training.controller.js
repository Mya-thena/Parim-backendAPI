const Training = require('../../models/training.model');
const EventTraining = require('../../models/eventTraining.model');
const { validationResult } = require('express-validator');

/**
 * @desc    Create new training content
 * @route   POST /api/training
 * @access  Admin
 */
exports.createTraining = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { title, description, youtubeUrl } = req.body;

        const training = await Training.create({
            title,
            description,
            videoUrl: youtubeUrl, // Mapping youtubeUrl to videoUrl as per model
            duration: 0, // Default
            category: 'General', // Default category
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Training created successfully',
            data: training
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Assign training to an event
 * @route   POST /api/training/assign
 * @access  Admin
 */
exports.assignTraining = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { eventId, trainingId } = req.body;

        // Check if training exists
        const training = await Training.findById(trainingId);
        if (!training) {
            return res.status(404).json({ success: false, message: 'Training not found' });
        }

        // Assign
        const assignment = await EventTraining.create({
            eventId,
            trainingId,
            assignedBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Training assigned to event successfully',
            data: assignment
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Training already assigned to this event' });
        }
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Get trainings for an event
 * @route   GET /api/training/events/:eventId
 * @access  Private (Staff/Admin)
 */
exports.getEventTrainings = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Find all assignments for this event
        const assignments = await EventTraining.find({ eventId })
            .populate('trainingId', 'title description videoUrl duration category isActive')
            .sort({ createdAt: -1 });

        // Extract training details and filter out inactive
        const trainings = assignments
            .filter(a => a.trainingId && a.trainingId.isActive)
            .map(a => ({
                ...a.trainingId.toObject(),
                assignedAt: a.assignedAt,
                assignmentId: a._id
            }));

        res.status(200).json({
            success: true,
            data: {
                trainings
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

/**
 * @desc    Soft delete training
 * @route   DELETE /api/training/:trainingId
 * @access  Admin
 */
exports.deleteTraining = async (req, res) => {
    try {
        const { trainingId } = req.params;

        // Soft delete: set isActive to false
        const training = await Training.findByIdAndUpdate(
            trainingId,
            { isActive: false },
            { new: true }
        );

        if (!training) {
            return res.status(404).json({ success: false, message: 'Training not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Training deleted successfully (soft delete)',
            data: training
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
