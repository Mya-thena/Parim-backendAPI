const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth.controller");

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User and Admin authentication and verification
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new staff user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - mail
 *               - phoneNumber
 *               - createPassword
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Kayode Owoseni
 *               mail:
 *                 type: string
 *                 example: devkraft@gmail.com
 *               phoneNumber:
 *                 type: string
 *                 example: 08012345678
 *               createPassword:
 *                 type: string
 *                 example: password123
 *               confirmPassword:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post("/register", authController.registerUser);

/**
 * @swagger
 * /api/auth/register-admin:
 *   post:
 *     summary: Register a new admin
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - mail
 *               - phoneNumber
 *               - createPassword
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Patrick Mya
 *               mail:
 *                 type: string
 *                 example: patrick.mya@example.com
 *               phoneNumber:
 *                 type: string
 *                 example: 08012345678
 *               createPassword:
 *                 type: string
 *                 example: password123
 *               confirmPassword:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin, event_manager]
 *                 example: event_manager
 *     responses:
 *       201:
 *         description: Admin registered successfully
 */
router.post("/register-admin", authController.registerAdmin);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *               - otp
 *             properties:
 *               mail:
 *                 type: string
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 example: 123456
 *               userType:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: user
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post("/verify-otp", authController.verifyOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user or admin
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *               - password
 *             properties:
 *               mail:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               userType:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: user
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: number
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *             properties:
 *               mail:
 *                 type: string
 *                 example: john@example.com
 *               userType:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: user
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post("/resend-otp", authController.resendOtp);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post("/refresh-token", authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (invalidate refresh token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional - logout from specific device. If not provided, logout from all devices.
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout",
  require("../../middlewares/rbac.middleware").protect,
  authController.logout
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     mail:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 */
router.get("/profile",
  require("../../middlewares/rbac.middleware").protect,
  authController.getProfile
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *             properties:
 *               mail:
 *                 type: string
 *                 example: devkraft@gmail.com
 *               userType:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       200:
 *         description: Password reset code sent
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mail
 *               - otp
 *               - newPassword
 *             properties:
 *               mail:
 *                 type: string
 *                 example: devkraft@gmail.com
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 example: password123
 *               userType:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", authController.resetPassword);

// Test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes working",
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *               address:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch("/profile", protect, authController.updateProfile);

module.exports = router;
