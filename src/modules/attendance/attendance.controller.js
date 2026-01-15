const Attendance = require("../../models/attendance.model");
const Participant = require("../../models/participant.model");
const Event = require("../../models/event.model");
const { validateQRToken } = require("./qr.controller");
const { successResponse, errorResponse, ERROR_CODES } = require("../../utils/responses");
const { HTTP_STATUS, ATTENDANCE_STATUS } = require("../../utils/constants");

/**
 * Check-in (Staff)
 * Staff checks in to an event using QR token
 */
exports.checkIn = async (req, res) => {
    try {
        const { qrToken } = req.body;
        const staffId = req.user._id || req.user.id;

        // Validation
        if (!qrToken) {
            return errorResponse(
                res,
                "QR token is required",
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        // 1. Validate QR Token (multi-layer validation)
        const qrValidation = await validateQRToken(qrToken);
        if (!qrValidation.valid) {
            return errorResponse(
                res,
                qrValidation.error,
                HTTP_STATUS.BAD_REQUEST,
                null,
                qrValidation.errorCode
            );
        }

        const { eventId } = qrValidation;

        // 2. Event Validation
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

        // Check event status
        if (event.status !== "published" && event.status !== "in_progress") {
            return errorResponse(
                res,
                "Event is not active",
                HTTP_STATUS.BAD_REQUEST,
                `Current status: ${event.status}`,
                ERROR_CODES.EVENT_NOT_PUBLISHED
            );
        }

        // 3. Check event time window (±2 hours grace period)
        const now = new Date();
        const eventStart = new Date(event.eventDate.start);
        const eventEnd = new Date(event.eventDate.end);
        const gracePeriod = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

        const allowedStart = new Date(eventStart.getTime() - gracePeriod);
        const allowedEnd = new Date(eventEnd.getTime() + gracePeriod);

        if (now < allowedStart || now > allowedEnd) {
            return errorResponse(
                res,
                "Check-in is only allowed within the event time window",
                HTTP_STATUS.BAD_REQUEST,
                `Event: ${eventStart.toISOString()} - ${eventEnd.toISOString()}`,
                ERROR_CODES.EVENT_TIME_INVALID
            );
        }

        // 4. Permission Validation - Check if staff is approved for this event
        const participant = await Participant.findOne({
            eventId,
            staffId,
            status: "approved"
        });

        if (!participant) {
            return errorResponse(
                res,
                "You are not approved to attend this event",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.NOT_APPROVED
            );
        }

        // 5. Find or Create Attendance Record
        let attendance = await Attendance.findOne({ eventId, staffId });

        if (!attendance) {
            // Create attendance record if it doesn't exist (should have been created on approval)
            attendance = await Attendance.create({
                eventId,
                staffId,
                roleId: participant.roleId,
                status: ATTENDANCE_STATUS.ASSIGNED
            });
        }

        // 6. Status Validation & Idempotency Check
        if (
            attendance.status === ATTENDANCE_STATUS.ACTIVE ||
            attendance.status === ATTENDANCE_STATUS.CHECKED_IN ||
            attendance.status === ATTENDANCE_STATUS.COMPLETED
        ) {
            return errorResponse(
                res,
                "Already checked in",
                HTTP_STATUS.CONFLICT,
                `Current status: ${attendance.status}`,
                ERROR_CODES.ALREADY_CHECKED_IN
            );
        }

        if (attendance.status === ATTENDANCE_STATUS.ABSENT) {
            return errorResponse(
                res,
                "You have been marked as absent. Contact admin for assistance",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.FORBIDDEN
            );
        }

        if (attendance.status !== ATTENDANCE_STATUS.ASSIGNED) {
            return errorResponse(
                res,
                `Cannot check-in from status: ${attendance.status}`,
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        // 7. Perform Check-in (State Transition: ASSIGNED → ACTIVE)
        await attendance.performCheckIn("qr", null);

        // Populate event and role details for response
        await attendance.populate("eventId", "title");
        await attendance.populate("roleId", "roleName");

        return successResponse(
            res,
            {
                attendanceId: attendance._id,
                status: attendance.status,
                checkedInAt: attendance.checkIn.time,
                event: {
                    id: event._id,
                    title: event.title,
                    role: attendance.roleId?.roleName || participant.roleName
                }
            },
            "Check-in successful"
        );
    } catch (error) {
        console.error("Check-in error:", error);
        return errorResponse(
            res,
            "Failed to check-in",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Check-out (Staff)
 * Staff checks out from an event using QR token
 */
exports.checkOut = async (req, res) => {
    try {
        const { qrToken } = req.body;
        const staffId = req.user._id || req.user.id;

        // Validation
        if (!qrToken) {
            return errorResponse(
                res,
                "QR token is required",
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        // 1. Validate QR Token
        const qrValidation = await validateQRToken(qrToken);
        if (!qrValidation.valid) {
            return errorResponse(
                res,
                qrValidation.error,
                HTTP_STATUS.BAD_REQUEST,
                null,
                qrValidation.errorCode
            );
        }

        const { eventId } = qrValidation;

        // 2. Find Attendance Record
        const attendance = await Attendance.findOne({ eventId, staffId })
            .populate("eventId", "title")
            .populate("roleId", "roleName");

        if (!attendance) {
            return errorResponse(
                res,
                "No attendance record found",
                HTTP_STATUS.NOT_FOUND,
                null,
                ERROR_CODES.NOT_FOUND
            );
        }

        // 3. Status Validation
        if (attendance.status === ATTENDANCE_STATUS.COMPLETED) {
            return errorResponse(
                res,
                "Already checked out",
                HTTP_STATUS.CONFLICT,
                `Checked out at: ${attendance.checkOut.time}`,
                ERROR_CODES.ALREADY_CHECKED_OUT
            );
        }

        if (
            attendance.status !== ATTENDANCE_STATUS.ACTIVE &&
            attendance.status !== ATTENDANCE_STATUS.CHECKED_IN
        ) {
            return errorResponse(
                res,
                "You must check-in first before checking out",
                HTTP_STATUS.BAD_REQUEST,
                `Current status: ${attendance.status}`,
                ERROR_CODES.NOT_CHECKED_IN
            );
        }

        // 4. Perform Check-out (State Transition: ACTIVE → COMPLETED)
        await attendance.performCheckOut("qr", null);

        return successResponse(
            res,
            {
                attendanceId: attendance._id,
                status: attendance.status,
                checkedInAt: attendance.checkIn.time,
                checkedOutAt: attendance.checkOut.time,
                duration: attendance.duration
            },
            "Check-out successful"
        );
    } catch (error) {
        console.error("Check-out error:", error);
        return errorResponse(
            res,
            "Failed to check-out",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Get My Attendance Status for Event (Staff)
 * Staff views their attendance status for a specific event
 */
exports.getMyStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const staffId = req.user._id || req.user.id;

        // Validate eventId
        if (!eventId) {
            return errorResponse(
                res,
                "Event ID is required",
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        // Find attendance record
        const attendance = await Attendance.findOne({ eventId, staffId })
            .populate("eventId", "title eventDate")
            .populate("roleId", "roleName");

        if (!attendance) {
            return errorResponse(
                res,
                "No attendance record found for this event",
                HTTP_STATUS.NOT_FOUND,
                "You may not be approved for this event yet",
                ERROR_CODES.NOT_FOUND
            );
        }

        return successResponse(
            res,
            {
                attendanceId: attendance._id,
                status: attendance.status,
                checkIn: attendance.checkIn?.time
                    ? {
                        time: attendance.checkIn.time,
                        method: attendance.checkIn.method
                    }
                    : null,
                checkOut: attendance.checkOut?.time
                    ? {
                        time: attendance.checkOut.time,
                        method: attendance.checkOut.method
                    }
                    : null,
                duration: attendance.duration,
                event: {
                    id: attendance.eventId._id,
                    title: attendance.eventId.title,
                    role: attendance.roleId?.roleName || "Unknown"
                },
                overridden: attendance.overridden,
                notes: attendance.notes || null
            },
            "Attendance status retrieved"
        );
    } catch (error) {
        console.error("Get my status error:", error);
        return errorResponse(
            res,
            "Failed to retrieve attendance status",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};
