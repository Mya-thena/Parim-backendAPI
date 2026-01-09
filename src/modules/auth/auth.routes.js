const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");


/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and verification
 */


/**
 * @swagger
 * /api/auth/create-account:
 *   post:
 *     summary: Create a new user account
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
 *                 example: Jane Doe
 *               mail:
 *                 type: string
 *                 example: jane@example.com
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
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 */
router.post("/create-account", authController.createAccount);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify user email with OTP
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
 *                 example: jane@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Account verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verify-otp", authController.verifyOtp);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
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
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       403:
 *         description: Account not verified
 *       400:
 *         description: Invalid credentials
 */



router.post("/login", authController.login);

module.exports = router;
