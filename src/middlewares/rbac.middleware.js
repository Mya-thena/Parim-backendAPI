const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');
const { HTTP_STATUS, RESPONSE_MESSAGES } = require('../utils/constants');

/**
 * Middleware to verify JWT token and attach user to request
 */
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.UNAUTHORIZED
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Determine user type and fetch appropriate model
    let user;
    if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.id).select('-password -refreshTokens');
    } else {
      user = await User.findById(decoded.id).select('-password -refreshTokens');
    }

    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.UNAUTHORIZED
      });
    }

    // Attach user and token info to request
    req.user = user;
    req.userType = decoded.userType;
    req.tokenExp = decoded.exp;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.UNAUTHORIZED,
        error: 'INVALID_TOKEN'
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * Middleware to ensure user is authenticated (alias for authenticate)
 */
exports.protect = exports.authenticate;

/**
 * Middleware to restrict access to specific user types
 */
exports.restrictTo = (...userTypes) => {
  return (req, res, next) => {
    if (!userTypes.includes(req.userType)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: RESPONSE_MESSAGES.FORBIDDEN,
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
};

/**
 * Middleware to restrict access to specific admin roles
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    // Only applicable to admins
    if (req.userType !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: RESPONSE_MESSAGES.FORBIDDEN,
        error: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: RESPONSE_MESSAGES.FORBIDDEN,
        error: 'INSUFFICIENT_ADMIN_ROLE'
      });
    }

    next();
  };
};

/**
 * Middleware to check specific permissions for admins
 */
exports.requirePermission = (permission) => {
  return (req, res, next) => {
    // Only applicable to admins
    if (req.userType !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: RESPONSE_MESSAGES.FORBIDDEN,
        error: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    // Super admins have all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: RESPONSE_MESSAGES.FORBIDDEN,
        error: 'PERMISSION_DENIED',
        details: `Required permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can access their own resources or has admin privileges
 */
exports.authorize = (userIdParam = 'userId') => {
  return (req, res, next) => {
    const targetUserId = req.params[userIdParam];
    const currentUserId = req.user._id.toString();

    // Allow access if user is accessing their own resources
    if (currentUserId === targetUserId) {
      return next();
    }

    // Allow access if user is admin
    if (req.userType === 'admin') {
      return next();
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: RESPONSE_MESSAGES.FORBIDDEN,
      error: 'RESOURCE_ACCESS_DENIED'
    });
  };
};

/**
 * Middleware to check if user account is verified
 */
exports.requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Account not verified. Please verify your email first.',
      error: 'ACCOUNT_NOT_VERIFIED'
    });
  }
  next();
};

/**
 * Middleware to check if user account is not locked
 */
exports.requireUnlocked = (req, res, next) => {
  if (req.user.isLocked) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Account is temporarily locked due to multiple failed attempts.',
      error: 'ACCOUNT_LOCKED'
    });
  }
  next();
};

/**
 * Middleware to validate refresh token
 */
exports.validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Refresh token is required',
        error: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user with this refresh token
    let user;
    if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.UNAUTHORIZED,
        error: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if refresh token exists and is not expired
    const tokenRecord = user.refreshTokens.find(rt => rt.token === refreshToken);
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token expired or invalid',
        error: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    req.user = user;
    req.userType = decoded.userType;
    req.refreshToken = refreshToken;

    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * Middleware to extract user info without strict authentication (for optional auth)
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without user
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.userType === 'admin') {
      user = await Admin.findById(decoded.id).select('-password -refreshTokens');
    } else {
      user = await User.findById(decoded.id).select('-password -refreshTokens');
    }

    if (user && user.isActive) {
      req.user = user;
      req.userType = decoded.userType;
      req.tokenExp = decoded.exp;
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};
