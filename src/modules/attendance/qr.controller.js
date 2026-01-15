const QRCode = require("../../models/qrCode.model");
const Event = require("../../models/event.model");
const jwt = require("jsonwebtoken");
const qrcode = require("qrcode");
const { successResponse, errorResponse, ERROR_CODES } = require("../../utils/responses");
const { HTTP_STATUS, QR_TOKEN_TYPE } = require("../../utils/constants");

/**
 * Generate QR Code for Event (Admin only)
 * Creates a new event-level QR code with JWT token
 */
exports.generateQRCode = async (req, res) => {
    try {
        const { eventId, expiresInMinutes = 120 } = req.body;
        const adminId = req.user._id || req.user.id;

        // Validation
        if (!eventId) {
            return errorResponse(
                res,
                "Event ID is required",
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        // Validate expiration time (30 min - 8 hours)
        if (expiresInMinutes < 30 || expiresInMinutes > 480) {
            return errorResponse(
                res,
                "Expiration time must be between 30 and 480 minutes",
                HTTP_STATUS.BAD_REQUEST,
                "Valid range: 30-480 minutes",
                ERROR_CODES.VALIDATION_ERROR
            );
        }

        // Check if event exists
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

        // Check if admin owns the event
        if (event.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to generate QR for this event",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Check if event is published
        if (event.status !== "published" && event.status !== "in_progress") {
            return errorResponse(
                res,
                "QR codes can only be generated for published or in-progress events",
                HTTP_STATUS.BAD_REQUEST,
                `Current status: ${event.status}`,
                ERROR_CODES.EVENT_NOT_PUBLISHED
            );
        }

        // Deactivate any existing active QR for this event
        await QRCode.updateMany(
            { eventId, isActive: true },
            { isActive: false }
        );

        // Calculate expiration
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        // Generate JWT token
        const token = jwt.sign(
            {
                eventId,
                type: QR_TOKEN_TYPE.EVENT_QR,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.QR_SECRET || process.env.JWT_SECRET,
            { expiresIn: `${expiresInMinutes}m` }
        );

        // Save to database
        const qrCodeRecord = await QRCode.create({
            eventId,
            token,
            expiresAt,
            createdBy: adminId,
            isActive: true
        });

        // Generate QR code image (base64)
        const qrImage = await qrcode.toDataURL(token, {
            errorCorrectionLevel: "M",
            type: "image/png",
            width: 300,
            margin: 1
        });

        return successResponse(
            res,
            {
                qrId: qrCodeRecord._id,
                qrImage,
                token,
                expiresAt,
                expiresInMinutes,
                eventTitle: event.title
            },
            "QR code generated successfully",
            HTTP_STATUS.CREATED
        );
    } catch (error) {
        console.error("Generate QR error:", error);
        return errorResponse(
            res,
            "Failed to generate QR code",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Get Active QR Code for Event (Admin only)
 * Retrieves the currently active QR code for an event
 */
exports.getActiveQRCode = async (req, res) => {
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
                "You don't have permission to view this QR code",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Get active QR code
        const qrCodeRecord = await QRCode.findOne({
            eventId,
            isActive: true
        });

        if (!qrCodeRecord) {
            return errorResponse(
                res,
                "No active QR code found for this event",
                HTTP_STATUS.NOT_FOUND,
                "Generate a new QR code to continue",
                ERROR_CODES.QR_NOT_FOUND
            );
        }

        // Check if expired
        const isExpired = qrCodeRecord.isExpired();
        const now = new Date();
        const remainingMinutes = isExpired
            ? 0
            : Math.floor((qrCodeRecord.expiresAt - now) / (1000 * 60));

        // Regenerate QR image from token
        const qrImage = await qrcode.toDataURL(qrCodeRecord.token, {
            errorCorrectionLevel: "M",
            type: "image/png",
            width: 300,
            margin: 1
        });

        return successResponse(
            res,
            {
                qrId: qrCodeRecord._id,
                qrImage,
                token: qrCodeRecord.token,
                expiresAt: qrCodeRecord.expiresAt,
                isExpired,
                remainingMinutes,
                eventTitle: event.title
            },
            isExpired ? "QR code has expired" : "Active QR code retrieved"
        );
    } catch (error) {
        console.error("Get active QR error:", error);
        return errorResponse(
            res,
            "Failed to retrieve QR code",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Deactivate QR Code (Admin only)
 * Manually deactivates a QR code before expiration
 */
exports.deactivateQRCode = async (req, res) => {
    try {
        const { qrId } = req.params;
        const adminId = req.user._id || req.user.id;

        // Find QR code
        const qrCodeRecord = await QRCode.findById(qrId);
        if (!qrCodeRecord) {
            return errorResponse(
                res,
                "QR code not found",
                HTTP_STATUS.NOT_FOUND,
                null,
                ERROR_CODES.QR_NOT_FOUND
            );
        }

        if (!qrCodeRecord.isActive) {
            return errorResponse(
                res,
                "QR code is already inactive",
                HTTP_STATUS.BAD_REQUEST,
                null,
                ERROR_CODES.BAD_REQUEST
            );
        }

        // Check if admin owns the event
        const event = await Event.findById(qrCodeRecord.eventId);
        if (!event || event.createdBy.toString() !== adminId.toString()) {
            return errorResponse(
                res,
                "You don't have permission to deactivate this QR code",
                HTTP_STATUS.FORBIDDEN,
                null,
                ERROR_CODES.PERMISSION_DENIED
            );
        }

        // Deactivate
        await qrCodeRecord.deactivate();

        return successResponse(
            res,
            {
                qrId: qrCodeRecord._id,
                deactivatedAt: new Date().toISOString()
            },
            "QR code deactivated successfully"
        );
    } catch (error) {
        console.error("Deactivate QR error:", error);
        return errorResponse(
            res,
            "Failed to deactivate QR code",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            error.message,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    }
};

/**
 * Validate QR Token (Helper function for attendance module)
 * Multi-layer validation of QR token
 * 
 * @param {string} token - JWT token from QR code
 * @returns {Object} { valid: boolean, eventId?: string, error?: string, errorCode?: string }
 */
exports.validateQRToken = async (token) => {
    try {
        // 1. Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.QR_SECRET || process.env.JWT_SECRET
        );

        // 2. Check token type
        if (decoded.type !== QR_TOKEN_TYPE.EVENT_QR) {
            return {
                valid: false,
                error: "Invalid token type",
                errorCode: ERROR_CODES.INVALID_QR_TOKEN
            };
        }

        // 3. Check if token exists in database and is active
        const qrCodeRecord = await QRCode.findOne({
            token,
            isActive: true
        });

        if (!qrCodeRecord) {
            return {
                valid: false,
                error: "QR code not found or inactive",
                errorCode: ERROR_CODES.QR_NOT_FOUND
            };
        }

        // 4. Check if expired
        if (qrCodeRecord.isExpired()) {
            return {
                valid: false,
                error: "QR code has expired",
                errorCode: ERROR_CODES.QR_EXPIRED
            };
        }

        return {
            valid: true,
            eventId: decoded.eventId,
            qrCodeRecord
        };
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return {
                valid: false,
                error: "QR code has expired",
                errorCode: ERROR_CODES.QR_EXPIRED
            };
        }
        if (error.name === "JsonWebTokenError") {
            return {
                valid: false,
                error: "Invalid QR code",
                errorCode: ERROR_CODES.INVALID_QR_TOKEN
            };
        }
        return {
            valid: false,
            error: error.message,
            errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR
        };
    }
};
