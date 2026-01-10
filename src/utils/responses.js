const { HTTP_STATUS } = require('./constants');

// Success response helper
exports.successResponse = (res, data = null, message = 'Operation successful', statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Error response helper
exports.errorResponse = (res, message = 'Internal server error', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: getErrorCode(statusCode),
      details
    },
    timestamp: new Date().toISOString()
  });
};

// Validation error response
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

// Get error code from status
function getErrorCode(statusCode) {
  const errorCodes = {
    [HTTP_STATUS.BAD_REQUEST]: 'BAD_REQUEST',
    [HTTP_STATUS.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HTTP_STATUS.FORBIDDEN]: 'FORBIDDEN',
    [HTTP_STATUS.NOT_FOUND]: 'NOT_FOUND',
    [HTTP_STATUS.CONFLICT]: 'CONFLICT',
    [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR'
  };
  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
}
