const { HTTP_STATUS } = require('./constants');

/**
 * Standard Success Response
 * 
 * @param {Object} res - Express response object
 * @param {Object|null} data - Response payload
 * @param {string} message - Human-readable success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
exports.successResponse = (res, data = null, message = 'Operation successful', statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Standard Error Response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string|Object|null} details - Additional error details for debugging
 * @param {string|null} customCode - Custom error code (optional, overrides auto-generated)
 * @returns {Object} JSON response
 */
exports.errorResponse = (res, message = 'Internal server error', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null, customCode = null) => {
  const code = customCode || getErrorCode(statusCode);

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details: details || undefined
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Validation Error Response (400)
 * 
 * @param {Object} res - Express response object
 * @param {Array|Object} errors - Validation error details
 * @returns {Object} JSON response
 */
exports.validationErrorResponse = (res, errors) => {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    message: 'Validation failed',
    error: {
      code: 'VALIDATION_ERROR',
      details: errors
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Not Found Response (404)
 * 
 * @param {Object} res - Express response object
 * @param {string} resource - Name of the resource not found
 * @returns {Object} JSON response
 */
exports.notFoundResponse = (res, resource = 'Resource') => {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `${resource} not found`,
    error: {
      code: 'NOT_FOUND'
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Unauthorized Response (401)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Custom message (optional)
 * @returns {Object} JSON response
 */
exports.unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    success: false,
    message,
    error: {
      code: 'UNAUTHORIZED'
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Forbidden Response (403)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Custom message (optional)
 * @returns {Object} JSON response
 */
exports.forbiddenResponse = (res, message = 'Access forbidden') => {
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message,
    error: {
      code: 'FORBIDDEN'
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Conflict Response (409)
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 * @param {string|Object|null} details - Additional details (optional)
 * @returns {Object} JSON response
 */
exports.conflictResponse = (res, message = 'Resource conflict', details = null) => {
  return res.status(HTTP_STATUS.CONFLICT).json({
    success: false,
    message,
    error: {
      code: 'CONFLICT',
      details: details || undefined
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated Response
 * 
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination details { page, limit, total }
 * @param {string} message - Success message
 * @returns {Object} JSON response
 */
exports.paginatedResponse = (res, items, pagination, message = 'Data retrieved successfully') => {
  const { page, limit, total } = pagination;
  const pages = Math.ceil(total / limit);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Get standard error code from HTTP status
 * 
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error code string
 */
function getErrorCode(statusCode) {
  const errorCodes = {
    [HTTP_STATUS.BAD_REQUEST]: 'BAD_REQUEST',
    [HTTP_STATUS.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HTTP_STATUS.FORBIDDEN]: 'FORBIDDEN',
    [HTTP_STATUS.NOT_FOUND]: 'NOT_FOUND',
    [HTTP_STATUS.CONFLICT]: 'CONFLICT',
    [HTTP_STATUS.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR'
  };
  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Error code mapping for frontend reference
 */
exports.ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Authorization
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Request
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // QR Codes
  QR_EXPIRED: 'QR_EXPIRED',
  QR_NOT_FOUND: 'QR_NOT_FOUND',
  INVALID_QR_TOKEN: 'INVALID_QR_TOKEN',

  // Attendance
  ALREADY_CHECKED_IN: 'ALREADY_CHECKED_IN',
  ALREADY_CHECKED_OUT: 'ALREADY_CHECKED_OUT',
  NOT_CHECKED_IN: 'NOT_CHECKED_IN',
  NOT_APPROVED: 'NOT_APPROVED',

  // Events
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  EVENT_NOT_PUBLISHED: 'EVENT_NOT_PUBLISHED',
  EVENT_TIME_INVALID: 'EVENT_TIME_INVALID',

  // Participants
  PARTICIPANT_NOT_FOUND: 'PARTICIPANT_NOT_FOUND',
  ALREADY_APPLIED: 'ALREADY_APPLIED',
  ALREADY_APPROVED: 'ALREADY_APPROVED',
  ROLE_FULL: 'ROLE_FULL',
  ROLE_CHANGE_FORBIDDEN: 'ROLE_CHANGE_FORBIDDEN',

  // Server
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};
