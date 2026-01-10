const crypto = require('crypto');
const { getCurrentTime } = require('../utils/timeHelper');
const { RESPONSE_MESSAGES } = require('../utils/constants');

class OTPService {
  constructor() {
    this.otpCache = new Map(); // For rate limiting and tracking
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    this.MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS) || 3;
    this.OTP_RESEND_COOLDOWN_MINUTES = 2;
  }

  /**
   * Generate a secure OTP
   */
  generateOTP() {
    return crypto.randomInt(0, Math.pow(10, this.OTP_LENGTH))
      .toString()
      .padStart(this.OTP_LENGTH, '0');
  }

  /**
   * Generate OTP with expiry
   */
  generateOTPWithExpiry() {
    const otp = this.generateOTP();
    const expiresAt = getCurrentTime().add(this.OTP_EXPIRY_MINUTES, 'minutes').toDate();
    
    return {
      otp,
      expiresAt,
      createdAt: getCurrentTime().toDate()
    };
  }

  /**
   * Check if user can request OTP (rate limiting)
   */
  canRequestOTP(email, userType = 'user') {
    const key = `${userType}:${email}`;
    const lastRequest = this.otpCache.get(key);
    
    if (!lastRequest) {
      return { canRequest: true };
    }

    const now = getCurrentTime();
    const timeDiff = now.diff(lastRequest.lastSent, 'minutes');
    
    if (timeDiff < this.OTP_RESEND_COOLDOWN_MINUTES) {
      const remainingTime = this.OTP_RESEND_COOLDOWN_MINUTES - timeDiff;
      return {
        canRequest: false,
        message: `Please wait ${Math.ceil(remainingTime)} minutes before requesting another OTP`,
        remainingTime: Math.ceil(remainingTime * 60) // in seconds
      };
    }

    return { canRequest: true };
  }

  /**
   * Record OTP request for rate limiting
   */
  recordOTPRequest(email, userType = 'user') {
    const key = `${userType}:${email}`;
    this.otpCache.set(key, {
      lastSent: getCurrentTime(),
      attempts: (this.otpCache.get(key)?.attempts || 0) + 1
    });

    // Clean up old entries periodically
    this.cleanupCache();
  }

  /**
   * Check if user has exceeded max OTP attempts
   */
  hasExceededAttempts(email, userType = 'user') {
    const key = `${userType}:${email}`;
    const record = this.otpCache.get(key);
    
    return record && record.attempts >= this.MAX_OTP_ATTEMPTS;
  }

  /**
   * Verify OTP with security checks
   */
  verifyOTP(storedOTP, userOTP, expiresAt, email, userType = 'user') {
    // Check if OTP has expired
    if (getCurrentTime().isAfter(expiresAt)) {
      return {
        isValid: false,
        message: RESPONSE_MESSAGES.OTP_EXPIRED,
        error: 'OTP_EXPIRED'
      };
    }

    // Check if user has exceeded attempts
    if (this.hasExceededAttempts(email, userType)) {
      return {
        isValid: false,
        message: 'Maximum OTP attempts exceeded. Please contact support.',
        error: 'MAX_ATTEMPTS_EXCEEDED'
      };
    }

    // Check if OTP matches
    if (storedOTP !== userOTP) {
      const key = `${userType}:${email}`;
      const record = this.otpCache.get(key);
      if (record) {
        record.attempts += 1;
        this.otpCache.set(key, record);
      }

      const remainingAttempts = this.MAX_OTP_ATTEMPTS - (record?.attempts || 0);
      
      return {
        isValid: false,
        message: `${RESPONSE_MESSAGES.INVALID_OTP}. ${remainingAttempts} attempts remaining.`,
        error: 'INVALID_OTP',
        remainingAttempts
      };
    }

    // Clear OTP record on successful verification
    this.clearOTPRecord(email, userType);

    return {
      isValid: true,
      message: 'OTP verified successfully'
    };
  }

  /**
   * Clear OTP record for user
   */
  clearOTPRecord(email, userType = 'user') {
    const key = `${userType}:${email}`;
    this.otpCache.delete(key);
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    const cutoffTime = getCurrentTime().subtract(1, 'hour');
    
    for (const [key, value] of this.otpCache.entries()) {
      if (value.lastSent.isBefore(cutoffTime)) {
        this.otpCache.delete(key);
      }
    }
  }

  /**
   * Get OTP statistics for monitoring
   */
  getStats() {
    return {
      totalActiveOTPs: this.otpCache.size,
      maxAttempts: this.MAX_OTP_ATTEMPTS,
      expiryMinutes: this.OTP_EXPIRY_MINUTES,
      resendCooldownMinutes: this.OTP_RESEND_COOLDOWN_MINUTES
    };
  }

  /**
   * Generate secure token for password reset
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure token for email verification
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Create singleton instance
const otpService = new OTPService();

module.exports = {
  otpService,
  generateOTP: () => otpService.generateOTP(),
  generateOTPWithExpiry: () => otpService.generateOTPWithExpiry(),
  canRequestOTP: (email, userType) => otpService.canRequestOTP(email, userType),
  recordOTPRequest: (email, userType) => otpService.recordOTPRequest(email, userType),
  verifyOTP: (storedOTP, userOTP, expiresAt, email, userType) => 
    otpService.verifyOTP(storedOTP, userOTP, expiresAt, email, userType),
  clearOTPRecord: (email, userType) => otpService.clearOTPRecord(email, userType),
  generateResetToken: () => otpService.generateResetToken(),
  generateVerificationToken: () => otpService.generateVerificationToken(),
  getOTPStats: () => otpService.getStats()
};
