const Participant = require("../../models/participant.model");
const Role = require("../../models/role.model");
const Event = require("../../models/event.model");
const Attendance = require("../../models/attendance.model");
const { HTTP_STATUS, ATTENDANCE_STATUS } = require("../../utils/constants");
const { successResponse, errorResponse } = require("../../utils/responses");

/**
 * Apply to an Event (Staff only)
 */
exports.applyToEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { roleId } = req.body;
        const staffId = req.user._id;

        // Validation
        if (!roleId) {
            return errorResponse(res, "Role ID is required", HTTP_STATUS.BAD_REQUEST);
        }

        // 1. Check Event Status
        const event = await Event.findById(eventId);
        if (!event || event.isDeleted) {
            return errorResponse(res, "Event not found", HTTP_STATUS.NOT_FOUND);
        }
        if (event.status !== 'published') {
            return errorResponse(res, "Event is not open for applications", HTTP_STATUS.BAD_REQUEST);
        }

        // 2. Check Role Validity & Capacity
        const role = await Role.findOne({ _id: roleId, eventId });
        if (!role) {
            return errorResponse(res, "Invalid role for this event", HTTP_STATUS.BAD_REQUEST);
        }
        if (role.filledSlots >= role.capacity) {
            return errorResponse(res, "Role is full", HTTP_STATUS.CONFLICT);
        }

        // 3. Check Duplicate Application
        const existingApplication = await Participant.findOne({ eventId, staffId });
        if (existingApplication) {
            return errorResponse(res, "You have already applied for this event", HTTP_STATUS.CONFLICT);
        }

        // 4. Create Participant Record
        const participant = await Participant.create({
            eventId,
            staffId,
            roleId,
            roleName: role.roleName,
            rolePrice: role.price,
            status: 'applied'
        });

        // 5. Update Role Count
        role.filledSlots += 1;
        await role.save();

        return successResponse(
            res,
            {
                participantId: participant._id,
                eventId: participant.eventId,
                role: participant.roleName,
                status: participant.status
            },
            "Application submitted successfully",
            HTTP_STATUS.CREATED
        );

    } catch (error) {
        console.error("Apply Error:", error);
        return errorResponse(
            res,
            "Failed to apply to event",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message
        );
    }
};

/**
 * List Participants (Admin only)
 * Grouped by role
 */
exports.listParticipants = async (req, res) => {
    try {
        const { eventId } = req.params;
        const adminId = req.user._id;

        // Check if admin owns the event
        const event = await Event.findById(eventId);
        if (!event || event.isDeleted) {
            return errorResponse(res, "Event not found", HTTP_STATUS.NOT_FOUND);
        }

        if (event.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to view participants for this event",
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Fetch all participants for the event
        const participants = await Participant.find({ eventId })
            .populate('staffId', 'fullName email phoneNumber profilePicture')
            .populate('roleId', 'roleName')
            .sort({ appliedAt: -1 });

        // Group by Role Name
        const grouped = participants.reduce((acc, curr) => {
            const role = curr.roleName;
            if (!acc[role]) {
                acc[role] = [];
            }
            acc[role].push({
                participantId: curr._id,
                staff: curr.staffId ? {
                    id: curr.staffId._id,
                    fullName: curr.staffId.fullName,
                    email: curr.staffId.email,
                    phoneNumber: curr.staffId.phoneNumber,
                    profilePicture: curr.staffId.profilePicture
                } : null,
                role: curr.roleName,
                rolePrice: curr.rolePrice,
                status: curr.status,
                appliedAt: curr.appliedAt
            });
            return acc;
        }, {});

        // Calculate summary
        const summary = {
            total: participants.length,
            applied: participants.filter(p => p.status === 'applied').length,
            approved: participants.filter(p => p.status === 'approved').length,
            rejected: participants.filter(p => p.status === 'rejected').length,
            cancelled: participants.filter(p => p.status === 'cancelled').length
        };

        return successResponse(res, {
            eventId,
            eventTitle: event.title,
            summary,
            participants: grouped
        }, "Participants retrieved successfully");

    } catch (error) {
        console.error("List Participants Error:", error);
        return errorResponse(
            res,
            "Failed to retrieve participants",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message
        );
    }
};

/**
 * Change Role (Staff - Pre-Approval Only)
 */
exports.changeRole = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { newRoleId, reason } = req.body;
        const staffId = req.user._id;

        // Validation
        if (!newRoleId || !reason) {
            return errorResponse(
                res,
                "New role ID and reason are required",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Find participant record
        const participant = await Participant.findOne({ eventId, staffId });
        if (!participant) {
            return errorResponse(
                res,
                "No application found for this event",
                HTTP_STATUS.NOT_FOUND
            );
        }

        // Check if status is 'applied' (not yet approved/rejected)
        if (participant.status !== "applied") {
            return errorResponse(
                res,
                "Role can only be changed before approval",
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Get new role
        const newRole = await Role.findOne({ _id: newRoleId, eventId });
        if (!newRole) {
            return errorResponse(
                res,
                "Invalid role for this event",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Check if new role has capacity
        if (newRole.filledSlots >= newRole.capacity) {
            return errorResponse(
                res,
                "New role is full",
                HTTP_STATUS.CONFLICT
            );
        }

        // Get old role
        const oldRole = await Role.findById(participant.roleId);
        const oldRoleName = participant.roleName;

        // Update in transaction-like manner
        // Decrement old role filled slots
        if (oldRole) {
            oldRole.filledSlots = Math.max(0, oldRole.filledSlots - 1);
            await oldRole.save();
        }

        // Increment new role filled slots
        newRole.filledSlots += 1;
        await newRole.save();

        // Update participant record
        participant.roleId = newRoleId;
        participant.roleName = newRole.roleName;
        participant.rolePrice = newRole.price;
        await participant.save();

        return successResponse(
            res,
            {
                participantId: participant._id,
                oldRole: oldRoleName,
                newRole: newRole.roleName,
                status: participant.status,
                reason
            },
            "Role changed successfully"
        );
    } catch (error) {
        console.error("Change role error:", error);
        return errorResponse(
            res,
            "Failed to change role",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message
        );
    }
};

/**
 * Withdraw Application (Staff)
 */
exports.withdrawApplication = async (req, res) => {
    try {
        const { eventId } = req.params;
        const staffId = req.user._id;

        // Find participant record
        const participant = await Participant.findOne({ eventId, staffId });
        if (!participant) {
            return errorResponse(
                res,
                "No application found for this event",
                HTTP_STATUS.NOT_FOUND
            );
        }

        // Check if can be withdrawn (applied or approved, but not yet event day)
        if (participant.status === "cancelled" || participant.status === "rejected") {
            return errorResponse(
                res,
                "Application already cancelled or rejected",
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Get role to decrement slots
        const role = await Role.findById(participant.roleId);
        if (role) {
            role.filledSlots = Math.max(0, role.filledSlots - 1);
            await role.save();
        }

        // Update status to cancelled (don't delete for audit trail)
        participant.status = "cancelled";
        await participant.save();

        // If attendance record exists, mark as absent
        const attendance = await Attendance.findOne({ eventId, staffId: participant.staffId });
        if (attendance) {
            attendance.status = ATTENDANCE_STATUS.ABSENT;
            attendance.notes = "Application withdrawn by staff";
            await attendance.save();
        }

        return successResponse(
            res,
            {
                participantId: participant._id,
                status: participant.status
            },
            "Application withdrawn successfully"
        );
    } catch (error) {
        console.error("Withdraw application error:", error);
        return errorResponse(
            res,
            "Failed to withdraw application",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message
        );
    }
};

/**
 * Approve Participant (Admin Only)
 * Creates attendance record upon approval
 */
exports.approveParticipant = async (req, res) => {
    try {
        const { participantId } = req.params;
        const adminId = req.user._id;

        // Find participant
        const participant = await Participant.findById(participantId)
            .populate("eventId")
            .populate("staffId", "fullName email");

        if (!participant) {
            return errorResponse(
                res,
                "Participant not found",
                HTTP_STATUS.NOT_FOUND
            );
        }

        // Check if admin owns the event
        if (participant.eventId.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to approve this participant",
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Check current status
        if (participant.status === "approved") {
            return errorResponse(
                res,
                "Participant already approved",
                HTTP_STATUS.CONFLICT
            );
        }

        if (participant.status !== "applied") {
            return errorResponse(
                res,
                `Cannot approve participant with status: ${participant.status}`,
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Update participant status
        participant.status = "approved";
        await participant.save();

        // Create attendance record
        let attendance;
        try {
            attendance = await Attendance.create({
                eventId: participant.eventId._id,
                staffId: participant.staffId._id,
                roleId: participant.roleId,
                status: ATTENDANCE_STATUS.ASSIGNED
            });
        } catch (err) {
            // If attendance already exists (shouldn't happen), just find it
            if (err.code === 11000) {
                attendance = await Attendance.findOne({
                    eventId: participant.eventId._id,
                    staffId: participant.staffId._id
                });
            } else {
                throw err;
            }
        }

        return successResponse(
            res,
            {
                participantId: participant._id,
                status: participant.status,
                attendanceId: attendance?._id,
                staff: {
                    id: participant.staffId._id,
                    fullName: participant.staffId.fullName,
                    email: participant.staffId.email
                }
            },
            "Participant approved successfully"
        );
    } catch (error) {
        console.error("Approve participant error:", error);
        return errorResponse(
            res,
            "Failed to approve participant",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message
        );
    }
};

/**
 * Reject Participant (Admin Only)
 */
exports.rejectParticipant = async (req, res) => {
    try {
        const { participantId } = req.params;
        const { reason } = req.body;
        const adminId = req.user._id;

        // Find participant
        const participant = await Participant.findById(participantId)
            .populate("eventId")
            .populate("staffId", "fullName email");

        if (!participant) {
            return errorResponse(
                res,
                "Participant not found",
                HTTP_STATUS.NOT_FOUND
            );
        }

        // Check if admin owns the event
        if (participant.eventId.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to reject this participant",
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Check current status
        if (participant.status === "rejected") {
            return errorResponse(
                res,
                "Participant already rejected",
                HTTP_STATUS.CONFLICT
            );
        }

        if (participant.status !== "applied") {
            return errorResponse(
                res,
                `Cannot reject participant with status: ${participant.status}`,
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Get role to decrement slots
        const role = await Role.findById(participant.roleId);
        if (role) {
            role.filledSlots = Math.max(0, role.filledSlots - 1);
            await role.save();
        }

        // Update participant status
        participant.status = "rejected";
        await participant.save();

        return successResponse(
            res,
            {
                participantId: participant._id,
                status: participant.status,
                reason: reason || null,
                staff: {
                    id: participant.staffId._id,
                    fullName: participant.staffId.fullName,
                    email: participant.staffId.email
                }
            },
            "Participant rejected successfully"
        );
    } catch (error) {
        console.error("Reject participant error:", error);
        return errorResponse(
            res,
            "Failed to reject participant",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message
        );
    }
};
