const Participant = require("../../models/participant.model");
const Role = require("../../models/role.model");
const Event = require("../../models/event.model");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../../utils/constants");

/**
 * Apply to an Event (Staff only)
 */
exports.applyToEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { roleId } = req.body;
        const staffId = req.user._id;

        // 1. Check Event Status
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
        }
        if (event.status !== 'published') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Event is not open for applications" });
        }

        // 2. Check Role Validity & Capacity
        const role = await Role.findOne({ _id: roleId, eventId });
        if (!role) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid role for this event" });
        }
        if (role.filledSlots >= role.capacity) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Role is full" });
        }

        // 3. Check Duplicate Application
        const existingApplication = await Participant.findOne({ eventId, staffId });
        if (existingApplication) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "You have already applied for this event" });
        }

        // 4. Create Participant Record (Transactional-like)
        // In a real prod environment with high concurrency, use transactions. 
        // For MVP/Node/Mongo without ReplicaSet strictly assumed: logic check first is ok.

        const participant = await Participant.create({
            eventId,
            staffId,
            roleId,
            roleName: role.roleName, // Snapshot
            rolePrice: role.price,   // Snapshot
            status: 'applied'
        });

        // 5. Update Role Count
        role.filledSlots += 1;
        await role.save();

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: "Application successful",
            data: { participant }
        });

    } catch (error) {
        console.error("Apply Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * List Participants (Admin only)
 * Grouped by role
 */
exports.listParticipants = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Fetch all participants for the event
        const participants = await Participant.find({ eventId })
            .populate('staffId', 'fullName mail phoneNumber staffId profilePicture') // Get user details
            .populate('roleId', 'roleName'); // Get current role details just in case

        // Group by Role Name
        const grouped = participants.reduce((acc, curr) => {
            const role = curr.roleName;
            if (!acc[role]) {
                acc[role] = [];
            }
            acc[role].push(curr);
            return acc;
        }, {});

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            data: grouped
        });

    } catch (error) {
        console.error("List Participants Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};
