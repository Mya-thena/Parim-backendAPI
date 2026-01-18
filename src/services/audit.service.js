const winston = require('winston');
const AuditLog = require('../models/auditLog.model');

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'parim-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

/**
 * Log an audit action to Database and File System
 * @param {Object} params
 * @param {Object} params.actor - User object performing the action
 * @param {String} params.action - Action name (e.g. PAYMENT_APPROVED)
 * @param {String} params.entityType - Type of entity (e.g. payment, event)
 * @param {String|ObjectId} params.entityId - ID of the entity
 * @param {Object} params.metadata - Additional data (e.g. oldStatus, newStatus)
 * @param {Object} params.req - Express request object (optional, for IP/Agent)
 * @param {String} params.severity - generic severity of log (default: 'medium')
 */
const logAudit = async ({
    actor,
    action,
    entityType,
    entityId,
    metadata = {},
    req = {},
    severity = 'medium'
}) => {
    try {
        // 1. Log to Winston (File/Console)
        logger.info({
            message: action,
            actorId: actor?._id || actor?.id,
            entityType,
            entityId,
            metadata,
            severity
        });

        // 2. Log to MongoDB
        await AuditLog.create({
            action,
            entityType,
            entityId,
            performedBy: actor?._id || actor?.id,
            // Mapping metadata to newValues/oldValues if applicable, 
            // or just storing in description/separate field if the model supports it.
            // Since existing AuditLog model has oldValues/newValues but NO metadata field,
            // and Spec asked for metadata. 
            // I will map 'oldStatus'/'newStatus' to oldValues/newValues if present in metadata.
            oldValues: metadata.oldStatus ? { status: metadata.oldStatus } : (metadata.oldValues || null),
            newValues: metadata.newStatus ? { status: metadata.newStatus } : (metadata.newValues || null),

            // Basic info
            ipAddress: req.ip || '0.0.0.0',
            userAgent: req.get ? req.get('User-Agent') : 'system',
            category: determineCategory(entityType),
            description: `Action ${action} performed on ${entityType} ${entityId}`,
            severity
        });

    } catch (error) {
        console.error('Audit Logging Failed:', error);
        // Don't throw, we don't want to break the main flow if logging fails
    }
};

const determineCategory = (entityType) => {
    const map = {
        'payment': 'payment',
        'event': 'event',
        'user': 'user',
        'staff': 'user',
        'attendance': 'attendance',
        'training': 'event'
    };
    return map[entityType] || 'system';
};

module.exports = {
    logAudit,
    logger
};
