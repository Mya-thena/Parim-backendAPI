const express = require("express");
const router = express.Router();
const bankController = require("../../controllers/bank.controller");
const { protect } = require("../../middlewares/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Bank
 *   description: Bank account management
 */

/**
 * @swagger
 * /api/bank/add:
 *   post:
 *     summary: Add bank account details
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankName
 *               - accountNumber
 *               - accountName
 *             properties:
 *               bankName:
 *                 type: string
 *                 example: Access Bank
 *               accountNumber:
 *                 type: string
 *                 example: 0123456789
 *               accountName:
 *                 type: string
 *                 example: Kayode Owoseni
 *     responses:
 *       200:
 *         description: Bank details added successfully
 */
router.post("/add", protect, bankController.addBankDetails);

/**
 * @swagger
 * /api/bank:
 *   get:
 *     summary: Get user's bank details
 *     tags: [Bank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank details retrieved
 */
router.get("/", protect, bankController.getBankDetails);

module.exports = router;
