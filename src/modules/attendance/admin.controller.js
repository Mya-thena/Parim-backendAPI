const Attendance = require("../../models/attendance.model");
const AttendanceOverride = require("../../models/attendanceOverride.model");
const Participant = require("../../models/participant.model");
const Event = require("../../models/event.model");
const { successResponse, errorResponse, ERROR_CODES } = require("../../utils/responses");
const { HTTP_STATUS, ATTENDANCE_STATUS, OVERRIDE_ACTION, ATTENDANCE_METHOD } = require("../../utils/constants");

/**
 * Get Live Attendance Statistics (Admin)
 * Real-time attendance overview for an event by the admin
 */
exports.getLiveStats = async (req, res) => {
    try {
        const { eventId } = req.params;
        const adminId = req.user._id || req.user.id;

        // Check if event exists and admin owns it
        const event = await Event.findById(eventId);
        if (!event || event.isDeleted) {
            return errorResponse(
                res,
                "Event not found",
                HTTP_STATUS.NOT_FOUND,
                null,
                ERROR_CODES.EVENT_NOT_FOUND
            );
        }

        if (event.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to view this event's attendance",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Count approved participants
        const totalApproved = await Participant.countDocuments({
            eventId,
            status: "approved"
        });

        // Get attendance stats by status
        const stats = await Attendance.aggregate([
            { $match: { eventId: event._id } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format stats
        const summary = {
            totalApproved,
            assigned: 0,
            checkedIn: 0,
            active: 0,
            completed: 0,
            absent: 0
        };

        stats.forEach(stat => {
            const status = stat._id.toLowerCase();
            if (status === "assigned") summary.assigned = stat.count;
            if (status === "checked_in") summary.checkedIn = stat.count;
            if (status === "active") summary.active = stat.count;
            if (status === "completed") summary.completed = stat.count;
            if (status === "absent") summary.absent = stat.count;
        });

        // Calculate percentages
        const attendanceCount = summary.active + summary.checkedIn + summary.completed;
        const attendanceRate = totalApproved > 0
            ? ((attendanceCount / totalApproved) * 100).toFixed(1)
            : 0;
        const completionRate = totalApproved > 0
            ? ((summary.completed / totalApproved) * 100).toFixed(1)
            : 0;

        return successResponse(
            res,
            {
                eventId: event._id,
                eventTitle: event.title,
                summary,
                percentages: {
                    attendance: parseFloat(attendanceRate),
                    completion: parseFloat(completionRate)
                },
                lastUpdated: new Date().toISOString()
            },
            "Live attendance statistics retrieved"
        );
    } catch (error) {
        console.error("Get live stats error:", error);
        return errorResponse(
            res,
            "Failed to retrieve live statistics",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Get Attendance Details (Admin)
 * Detailed attendance list with filtering and pagination
 */
exports.getAttendanceDetails = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        const adminId = req.user._id || req.user.id;

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        // Check if event exists and admin owns it
        const event = await Event.findById(eventId);
        if (!event || event.isDeleted) {
            return errorResponse(
                res,
                "Event not found",
                HTTP_STATUS.NOT_FOUND,
                null,
                ERROR_CODES.EVENT_NOT_FOUND
            );
        }

        if (event.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to view this event's attendance",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Build query
        const query = { eventId };
        if (status) {
            const validStatuses = Object.values(ATTENDANCE_STATUS);
            if (!validStatuses.includes(status.toUpperCase())) {
                return errorResponse(
                    res,
                    "Invalid status filter",
                    HTTP_STATUS.BAD_REQUEST,
                    `Valid statuses: ${validStatuses.join(", ")}`,
                    ERROR_CODES.VALIDATION_ERROR
                );
            }
            query.status = status.toUpperCase();
        }

        // Pagination
        const skip = (pageNum - 1) * limitNum;
        const total = await Attendance.countDocuments(query);

        // Get attendance records
        const attendances = await Attendance.find(query)
            .populate("staffId", "fullName mail phoneNumber")
            .populate("roleId", "roleName")
            .sort({ "checkIn.time": -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Format response
        const formattedAttendances = attendances.map(att => ({
            attendanceId: att._id,
            staff: att.staffId ? {
                id: att.staffId._id,
                fullName: att.staffId.fullName,
                email: att.staffId.mail,
                phoneNumber: att.staffId.phoneNumber
            } : null,
            role: att.roleId?.roleName || "Unknown",
            status: att.status,
            checkIn: att.checkIn?.time
                ? {
                    time: att.checkIn.time,
                    method: att.checkIn.method
                }
                : null,
            checkOut: att.checkOut?.time
                ? {
                    time: att.checkOut.time,
                    method: att.checkOut.method
                }
                : null,
            duration: att.duration,
            overridden: att.overridden,
            notes: att.notes || null
        }));

        return successResponse(
            res,
            {
                eventId: event._id,
                eventTitle: event.title,
                attendances: formattedAttendances,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                    hasNext: pageNum < Math.ceil(total / limitNum),
                    hasPrev: pageNum > 1
                }
            },
            "Attendance details retrieved"
        );
    } catch (error) {
        console.error("Get attendance details error:", error);
        return errorResponse(
            res,
            "Failed to retrieve attendance details",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Override Attendance (Admin)
 * Manually modify attendance records with full audit trail
 */
exports.overrideAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const { action, reason, checkInTime, checkOutTime, newStatus } = req.body;
        const adminId = req.user._id || req.user.id;

        // Validation
        if (!action || !reason) {
            return errorResponse(
                res,
                "Action and reason are required",
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        if (reason.length < 10) {
            return errorResponse(
                res,
                "Reason must be at least 10 characters",
                HTTP_STATUS.BAD_REQUEST,
                `Current length: ${reason.length}`,
                ERROR_CODES.VALIDATION_ERROR
            );
        }

        // Validate action
        const validActions = Object.values(OVERRIDE_ACTION);
        if (!validActions.includes(action)) {
            return errorResponse(
                res,
                "Invalid override action",
                HTTP_STATUS.BAD_REQUEST,
                `Valid actions: ${validActions.join(", ")}`,
                ERROR_CODES.VALIDATION_ERROR
            );
        }

        // Find attendance record
        const attendance = await Attendance.findById(attendanceId)
            .populate("eventId")
            .populate("staffId", "fullName email");

        if (!attendance) {
            return errorResponse(
                res,
                "Attendance record not found",
                HTTP_STATUS.NOT_FOUND,
                null,
                ERROR_CODES.NOT_FOUND
            );
        }

        // Check if admin owns the event
        if (attendance.eventId.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to override this attendance",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Create snapshot before changes
        const beforeSnapshot = attendance.getSnapshot();

        // Apply override based on action
        switch (action) {
            case OVERRIDE_ACTION.CHECK_IN_OVERRIDE:
                attendance.checkIn.time = checkInTime ? new Date(checkInTime) : new Date();
                attendance.checkIn.method = ATTENDANCE_METHOD.OVERRIDE;
                attendance.checkIn.verifiedBy = adminId;
                attendance.status = ATTENDANCE_STATUS.ACTIVE;
                break;

            case OVERRIDE_ACTION.CHECK_OUT_OVERRIDE:
                if (!attendance.checkIn?.time) {
                    return errorResponse(
                        res,
                        "Cannot override check-out without check-in",
                        HTTP_STATUS.BAD_REQUEST,
                        "Perform check-in override first",
                        ERROR_CODES.NOT_CHECKED_IN
                    );
                }
                attendance.checkOut.time = checkOutTime ? new Date(checkOutTime) : new Date();
                attendance.checkOut.method = ATTENDANCE_METHOD.OVERRIDE;
                attendance.checkOut.verifiedBy = adminId;
                attendance.status = ATTENDANCE_STATUS.COMPLETED;
                break;

            case OVERRIDE_ACTION.MARK_ABSENT:
                attendance.status = ATTENDANCE_STATUS.ABSENT;
                attendance.notes = reason;
                break;

            case OVERRIDE_ACTION.STATUS_CHANGE:
                if (!newStatus) {
                    return errorResponse(
                        res,
                        "New status is required for STATUS_CHANGE action",
                        HTTP_STATUS.BAD_REQUEST,
                        null,
                        ERROR_CODES.BAD_REQUEST
                    );
                }
                const validStatuses = Object.values(ATTENDANCE_STATUS);
                if (!validStatuses.includes(newStatus)) {
                    return errorResponse(
                        res,
                        "Invalid status value",
                        HTTP_STATUS.BAD_REQUEST,
                        `Valid statuses: ${validStatuses.join(", ")}`,
                        ERROR_CODES.VALIDATION_ERROR
                    );
                }
                attendance.status = newStatus;
                break;
        }

        attendance.overridden = true;
        if (reason && action !== OVERRIDE_ACTION.MARK_ABSENT) {
            attendance.notes = attendance.notes
                ? `${attendance.notes}\n[Override: ${reason}]`
                : `[Override: ${reason}]`;
        }
        await attendance.save();

        // Create audit record
        const afterSnapshot = attendance.getSnapshot();
        await AttendanceOverride.create({
            attendanceId: attendance._id,
            adminId,
            action,
            reason,
            before: beforeSnapshot,
            after: afterSnapshot,
            ipAddress: req.ip || req.connection?.remoteAddress || "unknown"
        });

        return successResponse(
            res,
            {
                attendanceId: attendance._id,
                action,
                previousStatus: beforeSnapshot.status,
                updatedStatus: attendance.status,
                staff: {
                    id: attendance.staffId._id,
                    fullName: attendance.staffId.fullName
                },
                overriddenAt: new Date().toISOString()
            },
            "Attendance overridden successfully"
        );
    } catch (error) {
        console.error("Override attendance error:", error);
        return errorResponse(
            res,
            "Failed to override attendance",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Get Override History (Admin)
 * View complete audit trail for an attendance record
 */
exports.getOverrideHistory = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const adminId = req.user._id || req.user.id;

        // Find attendance record
        const attendance = await Attendance.findById(attendanceId)
            .populate("eventId")
            .populate("staffId", "fullName email");

        if (!attendance) {
            return errorResponse(
                res,
                "Attendance record not found",
                HTTP_STATUS.NOT_FOUND,
                null,
                ERROR_CODES.NOT_FOUND
            );
        }

        // Check if admin owns the event
        if (attendance.eventId.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to view this override history",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Get all overrides for this attendance
        const overrides = await AttendanceOverride.find({ attendanceId })
            .populate("adminId", "fullName email")
            .sort({ createdAt: -1 });

        const formattedOverrides = overrides.map(override => ({
            overrideId: override._id,
            action: override.action,
            reason: override.reason,
            performedBy: override.adminId ? {
                id: override.adminId._id,
                fullName: override.adminId.fullName,
                email: override.adminId.email
            } : null,
            before: override.before,
            after: override.after,
            ipAddress: override.ipAddress,
            timestamp: override.createdAt
        }));

        return successResponse(
            res,
            {
                attendanceId: attendance._id,
                staff: {
                    id: attendance.staffId._id,
                    fullName: attendance.staffId.fullName,
                    email: attendance.staffId.email
                },
                currentStatus: attendance.status,
                totalOverrides: overrides.length,
                overrides: formattedOverrides
            },
            "Override history retrieved"
        );
    } catch (error) {
        console.error("Get override history error:", error);
        return errorResponse(
            res,
            "Failed to retrieve override history",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};
