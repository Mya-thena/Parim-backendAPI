const Event = require("../../models/event.model");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../../utils/constants");

/**
 * Create a new event (Admin only)
 */
exports.createEvent = async (req, res) => {
    try {
        const {
            title,
            shortDescription,
            longDescription,
            bannerImage,
            location,
            eventDate
        } = req.body;

        const event = await Event.create({
            title,
            shortDescription,
            longDescription,
            bannerImage,
            location,
            eventDate,
            createdBy: req.user._id,
            status: 'draft' // Default to draft
        });

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: "Event created successfully",
            data: { event }
        });
    } catch (error) {
        console.error("Create Event Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * Update event status (Admin only)
 * Publish, Draft, or Close an event
 */
exports.updateEventStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { status } = req.body;

        if (!['draft', 'published', 'closed'].includes(status)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Invalid status. Allowed: draft, published, closed"
            });
        }

        const event = await Event.findByIdAndUpdate(
            eventId,
            { status },
            { new: true }
        );

        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Event not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: `Event status updated to ${status}`,
            data: { event }
        });
    } catch (error) {
        console.error("Update Status Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * Update Event Details (Admin only)
 */
exports.updateEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const updates = req.body;

        // Prevent updating crucial fields directly via this route if needed
        // For now, allow updating everything passed in body except _id, createdBy, etc.
        delete updates._id;
        delete updates.createdBy;
        delete updates.createdAt;
        delete updates.updatedAt;

        const event = await Event.findByIdAndUpdate(
            eventId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Event not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Event updated successfully",
            data: { event }
        });
    } catch (error) {
        console.error("Update Event Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * List events with Search & Pagination
 * - Staff: See only PUBLISHED events
 * - Admin: See ALL events (can filter by status query)
 */
exports.listEvents = async (req, res) => {
    try {
        const userType = req.userType;
        const { status, search, page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;
        let query = {};

        // 1. Base Query: Always exclude deleted items
        query.isDeleted = false;

        // 2. Status & Scoping Filter
        if (userType === 'admin') {
            // Admin: Scope to OWN events only
            query.createdBy = req.user._id;

            if (status) query.status = status;
        } else {
            // Staff: Published events only
            query.status = 'published';
        }

        // 2. Search Logic (Unique ID, Title, Venue, State, Event Manager)
        if (search) {
            const searchRegex = new RegExp(search, 'i');

            // If searching for Event Manager (createdBy name), we need to find those Users/Admins first
            // If mixed User/Admin creation, we check both. Assuming Admin for now as main event creators.
            const Admin = require("../../models/admin.model");
            const matchingAdmins = await Admin.find({ fullName: searchRegex }).select('_id');
            const adminIds = matchingAdmins.map(a => a._id);

            query.$or = [
                { uniqueId: searchRegex },
                { title: searchRegex },
                { "location.venue": searchRegex },
                { "location.state": searchRegex },
                { createdBy: { $in: adminIds } } // Match events created by these admins
            ];
        }

        const events = await Event.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'fullName mail') // Creator details
            .populate({
                path: 'roles',
                match: { isActive: true, isDeleted: false },
                select: 'roleName price capacity duration roleDescription'
            });

        const totalEvents = await Event.countDocuments(query);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Events retrieved successfully",
            pagination: {
                total: totalEvents,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalEvents / limit)
            },
            data: { events }
        });
    } catch (error) {
        console.error("List Events Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * Get Event by Unique ID (Share Link Route)
 */
exports.getEventByUniqueId = async (req, res) => {
    try {
        const { uniqueId } = req.params;
        const event = await Event.findOne({ uniqueId })
            .populate('createdBy', 'fullName mail')
            .populate({
                path: 'roles',
                match: { isActive: true, isDeleted: false },
                select: 'roleName price capacity duration roleDescription'
            });

        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Event not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Event details retrieved",
            data: { event }
        });
    } catch (error) {
        console.error("Get Event By ID Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * Safe Delete Event (Admin only)
 * - Checks for active participants
 * - Soft deletes if safe
 */
exports.deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        // 1. Find Event (Scoped to Creator)
        const event = await Event.findOne({
            _id: eventId,
            createdBy: userId,
            isDeleted: false
        });

        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Event not found or you do not have permission to delete it"
            });
        }

        // 2. Safety Check: Active Participants
        // Assuming we have a Participant model. We need to require it at top or here.
        // Let's assume passed in request or imported. 
        // Need to ensure Participant model is imported. 
        const Participant = require("../../models/participant.model");
        const activeParticipants = await Participant.countDocuments({
            eventId: eventId,
            status: { $in: ['applied', 'approved'] } // Exclude cancelled/rejected
        });

        if (activeParticipants > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: `Cannot delete event. There are ${activeParticipants} active participant(s). Please reject or cancel them first.`
            });
        }

        // 3. Soft Delete
        event.isDeleted = true;
        event.status = 'closed'; // Close it too
        await event.save();

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Event deleted successfully (Safe Delete)"
        });

    } catch (error) {
        console.error("Delete Event Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};
