const Role = require("../../models/role.model");
const Event = require("../../models/event.model");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../../utils/constants");

/**
 * Create a Role for an Event (Admin only)
 */
exports.createRole = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { roleName, roleDescription, price, capacity, duration } = req.body;

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Event not found"
            });
        }

        // Create Role
        const role = await Role.create({
            eventId,
            roleName,
            roleDescription,
            price,
            capacity,
            duration
        });

        // Add role reference to Event (optional, but good for bidirectional nav usually, 
        // though schema shows embedded array of IDs, let's update it to stay consistent with that schema field)
        await Event.findByIdAndUpdate(eventId, {
            $push: { roles: role._id }
        });

        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: "Role created successfully",
            data: { role }
        });
    } catch (error) {
        console.error("Create Role Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * Update Role (Admin only)
 */
exports.updateRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const updates = req.body;

        // Prevent updating eventId or critical counters manually if unsafe
        delete updates._id;
        delete updates.eventId;
        delete updates.filledSlots;

        const role = await Role.findByIdAndUpdate(
            roleId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!role) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: "Role not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Role updated successfully",
            data: { role }
        });
    } catch (error) {
        console.error("Update Role Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

/**
 * List Roles for an Event
 */
exports.listRoles = async (req, res) => {
    try {
        const { eventId } = req.params;

        const roles = await Role.find({ eventId, isActive: true });

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Roles retrieved successfully",
            count: roles.length,
            data: { roles }
        });
    } catch (error) {
        console.error("List Roles Error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};
