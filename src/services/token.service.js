const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getCurrentTime } = require('../utils/timeHelper');

class TokenService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
    this.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'parim-pro',
      audience: 'parim-pro-users'
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
      issuer: 'parim-pro',
      audience: 'parim-pro-users'
    });
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(userId, userType, additionalPayload = {}) {
    const basePayload = {
      id: userId,
      userType,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID
    };

    const payload = { ...basePayload, ...additionalPayload };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: this.parseExpiration(this.JWT_EXPIRES_IN),
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'parim-pro',
        audience: 'parim-pro-users'
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'parim-pro',
        audience: 'parim-pro-users'
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - currentTime);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Parse expiration string to seconds
   */
  parseExpiration(expiration) {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // Default 15 minutes
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId, userType) {
    const payload = {
      id: userId,
      userType,
      type: 'password_reset',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'parim-pro',
      audience: 'parim-pro-users'
    });
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId, userType, email) {
    const payload = {
      id: userId,
      userType,
      email,
      type: 'email_verification',
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'parim-pro',
      audience: 'parim-pro-users'
    });
  }

  /**
   * Verify special purpose tokens (password reset, email verification)
   */
  verifySpecialToken(token, expectedType) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'parim-pro',
        audience: 'parim-pro-users'
      });

      if (decoded.type !== expectedType) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate device fingerprint for additional security
   */
  generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    const platform = req.headers['sec-ch-ua-platform'] || '';
    
    return crypto.createHash('sha256')
      .update(`${userAgent}${ip}${platform}`)
      .digest('hex');
  }

  /**
   * Create token response object
   */
  createTokenResponse(userId, userType, user, additionalData = {}) {
    const tokens = this.generateTokenPair(userId, userType);
    
    return {
      success: true,
      message: 'Authentication successful',
      data: {
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
        },
        ...additionalData
      },
      timestamp: getCurrentTime().toISOString()
    };
  }
}

// Create singleton instance
const tokenService = new TokenService();

module.exports = {
  tokenService,
  generateAccessToken: (payload) => tokenService.generateAccessToken(payload),
  generateRefreshToken: (payload) => tokenService.generateRefreshToken(payload),
  generateTokenPair: (userId, userType, payload) => 
    tokenService.generateTokenPair(userId, userType, payload),
  verifyAccessToken: (token) => tokenService.verifyAccessToken(token),
  verifyRefreshToken: (token) => tokenService.verifyRefreshToken(token),
  generatePasswordResetToken: (userId, userType) => 
    tokenService.generatePasswordResetToken(userId, userType),
  generateEmailVerificationToken: (userId, userType, email) => 
    tokenService.generateEmailVerificationToken(userId, userType, email),
  verifySpecialToken: (token, type) => tokenService.verifySpecialToken(token, type),
  createTokenResponse: (userId, userType, user, data) => 
    tokenService.createTokenResponse(userId, userType, user, data),
  isTokenExpired: (token) => tokenService.isTokenExpired(token),
  getTokenRemainingTime: (token) => tokenService.getTokenRemainingTime(token),
  generateDeviceFingerprint: (req) => tokenService.generateDeviceFingerprint(req)
};
