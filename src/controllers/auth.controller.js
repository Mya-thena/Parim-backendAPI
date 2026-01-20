const User = require("../models/user.model");
const Admin = require("../models/admin.model");
const bcrypt = require("bcrypt");
const { sendOtpMail, sendPasswordResetMail } = require("../services/mail.service");
const {
  generateOTPWithExpiry,
  canRequestOTP,
  recordOTPRequest,
  verifyOTP,
  clearOTPRecord
} = require("../services/otp.service");
const {
  generateTokenPair,
  verifyRefreshToken,
  createTokenResponse
} = require("../services/token.service");
const { successResponse, errorResponse } = require("../utils/responses");
const { RESPONSE_MESSAGES, HTTP_STATUS } = require("../utils/constants");
const { getCurrentTime } = require("../utils/timeHelper");

/* =======================
   USER REGISTRATION
======================= */
exports.registerUser = async (req, res) => {
  try {
    const {
      fullName,
      mail,
      phoneNumber,
      createPassword,
      confirmPassword
    } = req.body;

    // Validate input
    if (!fullName || !mail || !phoneNumber || !createPassword || !confirmPassword) {
      return errorResponse(res, RESPONSE_MESSAGES.ALL_FIELDS_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (createPassword !== confirmPassword) {
      return errorResponse(res, RESPONSE_MESSAGES.PASSWORDS_NOT_MATCH, HTTP_STATUS.BAD_REQUEST);
    }

    // Check existing user
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return errorResponse(res, RESPONSE_MESSAGES.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Check if user can request OTP
    const otpCheck = canRequestOTP(mail, 'user');
    if (!otpCheck.canRequest) {
      return errorResponse(res, otpCheck.message, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createPassword, 12);

    // Create user (NOT verified yet)
    let user;
    try {
      user = await User.create({
        fullName,
        mail,
        phoneNumber,
        password: hashedPassword,
        password: hashedPassword,
        isVerified: false
      });
      console.log('User created successfully:', user._id);
    } catch (createError) {
      console.error('User creation error:', createError);
      throw createError;
    }

    // Generate OTP
    const { otp, expiresAt } = generateOTPWithExpiry();

    await User.findByIdAndUpdate(user._id, {
      otp,
      otpExpiresAt: expiresAt
    });

    // Record OTP request
    recordOTPRequest(mail, 'user');

    // Send OTP email
    try {
      await sendOtpMail(mail, otp);
    } catch (emailError) {
      console.log('Email service error (continuing anyway):', emailError.message);
      // Continue with registration even if email fails for testing
    }

    successResponse(res, null, RESPONSE_MESSAGES.ACCOUNT_CREATED, HTTP_STATUS.CREATED);

  } catch (error) {
    console.error("User registration error:", error);

    // Check for duplicate key errors (code 11000)
    if (error.code === 11000) {
      let field = Object.keys(error.keyPattern || {})[0] || 'account';
      let message = RESPONSE_MESSAGES.EMAIL_EXISTS;

      if (field === 'staffId') {
        message = "A problem occurred with staff ID generation. Please try again.";
      } else if (field === 'mail') {
        message = RESPONSE_MESSAGES.EMAIL_EXISTS;
      } else {
        message = `An account with this ${field} already exists.`;
      }

      return errorResponse(res, message, HTTP_STATUS.CONFLICT);
    }

    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   ADMIN REGISTRATION (Super Admin only)
======================= */
exports.registerAdmin = async (req, res) => {
  try {
    const {
      fullName,
      mail,
      phoneNumber,
      createPassword,
      confirmPassword,
      role = 'event_manager'
    } = req.body;

    // Validate input
    if (!fullName || !mail || !phoneNumber || !createPassword || !confirmPassword) {
      return errorResponse(res, RESPONSE_MESSAGES.ALL_FIELDS_REQUIRED, HTTP_STATUS.BAD_REQUEST);
    }

    if (createPassword !== confirmPassword) {
      return errorResponse(res, RESPONSE_MESSAGES.PASSWORDS_NOT_MATCH, HTTP_STATUS.BAD_REQUEST);
    }

    // Check existing admin
    const existingAdmin = await Admin.findOne({ mail });
    if (existingAdmin) {
      return errorResponse(res, RESPONSE_MESSAGES.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
    }

    // Check if admin can request OTP
    const otpCheck = canRequestOTP(mail, 'admin');
    if (!otpCheck.canRequest) {
      return errorResponse(res, otpCheck.message, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createPassword, 12);

    // Create admin (NOT verified yet)
    let admin;
    try {
      admin = await Admin.create({
        fullName,
        mail,
        phoneNumber,
        password: hashedPassword,
        role,
        permissions: [], // Default to empty
        isVerified: false
      });
    } catch (createError) {
      console.error('Admin creation error:', createError);
      throw createError;
    }

    // Generate OTP
    const { otp, expiresAt } = generateOTPWithExpiry();

    await Admin.findByIdAndUpdate(admin._id, {
      otp,
      otpExpiresAt: expiresAt
    });

    // Record OTP request
    recordOTPRequest(mail, 'admin');

    // Send OTP email
    try {
      await sendOtpMail(mail, otp);
    } catch (emailError) {
      console.log('Email service error (continuing anyway):', emailError.message);
      // Continue with registration even if email fails for testing
    }

    successResponse(res, null, RESPONSE_MESSAGES.ACCOUNT_CREATED, HTTP_STATUS.CREATED);

  } catch (error) {
    console.error("Admin registration error:", error);

    // Check for duplicate key errors (code 11000)
    if (error.code === 11000) {
      let field = Object.keys(error.keyPattern || {})[0] || 'account';
      let message = RESPONSE_MESSAGES.EMAIL_EXISTS;

      if (field === 'mail') {
        message = RESPONSE_MESSAGES.EMAIL_EXISTS;
      } else {
        message = `An account with this ${field} already exists.`;
      }

      return errorResponse(res, message, HTTP_STATUS.CONFLICT);
    }

    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   VERIFY OTP (Common for both)
======================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { mail, otp, userType = 'user' } = req.body;

    if (!mail || !otp) {
      return errorResponse(res, "Email and OTP are required", HTTP_STATUS.BAD_REQUEST);
    }

    const Model = userType === 'admin' ? Admin : User;
    const user = await Model.findOne({ mail });

    if (!user) {
      return errorResponse(res, RESPONSE_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.isVerified) {
      return errorResponse(res, RESPONSE_MESSAGES.ACCOUNT_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
    }

    // Verify OTP with security checks
    const verification = verifyOTP(user.otp, otp, user.otpExpiresAt, mail, userType);

    if (!verification.isValid) {
      return errorResponse(res, verification.message, HTTP_STATUS.BAD_REQUEST, {
        error: verification.error,
        remainingAttempts: verification.remainingAttempts
      });
    }

    // Verify user
    await Model.findByIdAndUpdate(user._id, {
      isVerified: true,
      otp: null,
      otpExpiresAt: null
    });

    successResponse(res, null, RESPONSE_MESSAGES.ACCOUNT_VERIFIED);

  } catch (error) {
    console.error("OTP verification error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   LOGIN (Common for both)
======================= */
exports.login = async (req, res) => {
  try {
    const { mail, password, userType = 'user' } = req.body;
    const deviceInfo = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!mail || !password) {
      return errorResponse(res, "Email and password are required", HTTP_STATUS.BAD_REQUEST);
    }

    const Model = userType === 'admin' ? Admin : User;
    const user = await Model.findByCredentials(mail, password);

    if (!user) {
      return errorResponse(res, RESPONSE_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isVerified) {
      return errorResponse(res, RESPONSE_MESSAGES.ACCOUNT_NOT_VERIFIED, HTTP_STATUS.UNAUTHORIZED);
    }

    // Generate tokens
    const tokens = generateTokenPair(user._id, userType);

    // Store refresh token
    await user.addRefreshToken(tokens.refreshToken, deviceInfo, ipAddress);

    // Create response manually using the generated tokens
    const responseData = {
      user: {
        id: user._id,
        fullName: user.fullName,
        mail: user.mail,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        ...(userType === 'admin' ? {
          role: user.role,
          permissions: user.permissions
        } : {
          staffId: user.staffId,
          department: user.department,
          position: user.position
        })
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      }
    };

    successResponse(res, responseData, RESPONSE_MESSAGES.LOGIN_SUCCESS);

  } catch (error) {
    console.error("Login error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   RESEND OTP
======================= */
exports.resendOtp = async (req, res) => {
  try {
    const { mail, userType = 'user', type = 'verification' } = req.body;

    if (!mail) {
      return errorResponse(res, "Email is required", HTTP_STATUS.BAD_REQUEST);
    }

    const Model = userType === 'admin' ? Admin : User;
    const user = await Model.findOne({ mail });

    if (!user) {
      return errorResponse(res, RESPONSE_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Only check verification status if this is for initial verification
    if (type === 'verification' && user.isVerified) {
      return errorResponse(res, RESPONSE_MESSAGES.ACCOUNT_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
    }

    // Check if user can request OTP
    const otpCheck = canRequestOTP(mail, userType);
    if (!otpCheck.canRequest) {
      return errorResponse(res, otpCheck.message, HTTP_STATUS.TOO_MANY_REQUESTS, {
        remainingTime: otpCheck.remainingTime
      });
    }

    // Generate new OTP
    const { otp, expiresAt } = generateOTPWithExpiry();

    await Model.findByIdAndUpdate(user._id, {
      otp,
      otpExpiresAt: expiresAt
    });

    // Record OTP request
    recordOTPRequest(mail, userType);

    // Send OTP email based on type
    console.log(`[DEV] Resend ${type} OTP for ${mail}: ${otp}`);
    try {
      if (type === 'password_reset') {
        await sendPasswordResetMail(mail, otp);
      } else {
        await sendOtpMail(mail, otp);
      }
    } catch (emailError) {
      console.log('Email service error (continuing anyway):', emailError.message);
    }

    successResponse(res, null, type === 'password_reset' ? "Password reset OTP resent" : RESPONSE_MESSAGES.OTP_SENT);

  } catch (error) {
    console.error("Resend OTP error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   REFRESH TOKEN
======================= */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const deviceInfo = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!refreshToken) {
      return errorResponse(res, "Refresh token is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Verify refresh token
    const decoded = require('../services/token.service').verifyRefreshToken(refreshToken);

    const Model = decoded.userType === 'admin' ? Admin : User;
    const user = await Model.findById(decoded.id);

    if (!user || !user.isActive) {
      return errorResponse(res, RESPONSE_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    }

    // Check if refresh token exists and is valid
    const tokenRecord = user.refreshTokens.find(rt => rt.token === refreshToken);
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return errorResponse(res, "Invalid or expired refresh token", HTTP_STATUS.UNAUTHORIZED);
    }

    // Generate new tokens
    const tokens = generateTokenPair(user._id, decoded.userType);

    // Remove old refresh token and add new one
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken, deviceInfo, ipAddress);

    // Create response manually
    const responseData = {
      user: {
        id: user._id,
        fullName: user.fullName,
        mail: user.mail,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        ...(decoded.userType === 'admin' ? {
          role: user.role,
          permissions: user.permissions
        } : {
          staffId: user.staffId,
          department: user.department,
          position: user.position
        })
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      }
    };

    successResponse(res, responseData, "Token refreshed successfully");

  } catch (error) {
    console.error("Refresh token error:", error);
    errorResponse(res, "Invalid refresh token", HTTP_STATUS.UNAUTHORIZED);
  }
};

/* =======================
   LOGOUT
======================= */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const Model = req.userType === 'admin' ? Admin : User;

    // Authenticate middleware excludes refreshTokens, so we might need to fetch the user again
    const user = await Model.findById(req.user._id);

    if (refreshToken) {
      // Remove specific refresh token
      await user.removeRefreshToken(refreshToken);
    } else {
      // Remove all refresh tokens (logout from all devices)
      await user.clearAllRefreshTokens();
    }

    successResponse(res, null, "Logged out successfully");

  } catch (error) {
    console.error("Logout error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   GET PROFILE
======================= */
exports.getProfile = async (req, res) => {
  try {
    const profileData = {
      id: req.user._id,
      fullName: req.user.fullName,
      mail: req.user.mail,
      phoneNumber: req.user.phoneNumber,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin
    };

    if (req.userType === 'admin') {
      profileData.role = req.user.role;
      profileData.permissions = req.user.permissions;
    } else {
      profileData.staffId = req.user.staffId;
    }

    successResponse(res, profileData, "Profile retrieved successfully");

  } catch (error) {
    console.error("Get profile error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   FORGOT PASSWORD
======================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { mail, userType = 'user' } = req.body;

    if (!mail) {
      return errorResponse(res, "Email is required", HTTP_STATUS.BAD_REQUEST);
    }

    const Model = userType === 'admin' ? Admin : User;
    const user = await Model.findOne({ mail });

    if (!user) {
      return errorResponse(res, RESPONSE_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check if user can request OTP
    const otpCheck = canRequestOTP(mail, userType);
    if (!otpCheck.canRequest) {
      return errorResponse(res, otpCheck.message, HTTP_STATUS.TOO_MANY_REQUESTS, {
        remainingTime: otpCheck.remainingTime
      });
    }

    // Generate new OTP
    const { otp, expiresAt } = generateOTPWithExpiry();

    await Model.findByIdAndUpdate(user._id, {
      otp,
      otpExpiresAt: expiresAt
    });

    // Record OTP request
    recordOTPRequest(mail, userType);

    // Send Password Reset Email
    console.log(`[DEV] Password Reset OTP for ${mail}: ${otp}`);
    try {
      await sendPasswordResetMail(mail, otp);
    } catch (emailError) {
      console.log('Email service error (continuing anyway):', emailError.message);
    }

    successResponse(res, null, "Password reset code sent to email");

  } catch (error) {
    console.error("Forgot password error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   RESET PASSWORD
======================= */
exports.resetPassword = async (req, res) => {
  try {
    const { mail, otp, newPassword, userType = 'user' } = req.body;

    if (!mail || !otp || !newPassword) {
      return errorResponse(res, "Email, OTP, and new password are required", HTTP_STATUS.BAD_REQUEST);
    }

    const Model = userType === 'admin' ? Admin : User;
    const user = await Model.findOne({ mail });

    if (!user) {
      return errorResponse(res, RESPONSE_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Verify OTP
    const verification = verifyOTP(user.otp, otp, user.otpExpiresAt, mail, userType);
    if (!verification.isValid) {
      return errorResponse(res, verification.message, HTTP_STATUS.BAD_REQUEST, {
        error: verification.error
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password, clear OTP, and clear refresh tokens (logout all devices)
    await Model.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      otp: null,
      otpExpiresAt: null,
      refreshTokens: [] // Force fresh login for security
    });

    // Clear rate limit record
    clearOTPRecord(mail, userType);

    successResponse(res, null, "Password has been reset successfully. Please login with your new password.");

  } catch (error) {
    console.error("Reset password error:", error);
    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/* =======================
   UPDATE PROFILE (Common for both)
======================= */
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber } = req.body;
    const Model = req.userType === 'admin' ? Admin : User;

    const updatedUser = await Model.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          ...(fullName && { fullName }),
          ...(phoneNumber && { phoneNumber }),
        }
      },
      { new: true, runValidators: true, select: "-password -refreshTokens -otp -otpExpiresAt" }
    );

    if (!updatedUser) {
      return errorResponse(res, RESPONSE_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    successResponse(res, updatedUser, "Profile updated successfully");

  } catch (error) {
    console.error("Update profile error:", error);

    // Check for duplicate key errors (e.g. phone number if unique)
    if (error.code === 11000) {
      return errorResponse(res, "This information is already in use by another account", HTTP_STATUS.CONFLICT);
    }

    errorResponse(res, RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};
