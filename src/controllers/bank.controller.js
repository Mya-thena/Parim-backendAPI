const Bank = require("../models/bank.model");
const { resolveAccount, validateBVN } = require("../services/paystack.service");

/* =======================
   ADD BANK DETAILS
======================= */
exports.addBankDetails = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { bankName, accountName, accountNumber, bvn } = req.body;

    // Validate input
    if (!bankName || !accountNumber || !bvn) {
      return res.status(400).json({
        success: false,
        message: "Bank name, account number, and BVN are required"
      });
    }

    // Validate account number length (10 digits)
    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: "Account number must be exactly 10 digits"
      });
    }

    // Validate BVN length (11 digits)
    if (bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
      return res.status(400).json({
        success: false,
        message: "BVN must be exactly 11 digits"
      });
    }

    // Check if user already has bank details
    const existingBank = await Bank.findOne({ userId });
    if (existingBank) {
      return res.status(400).json({
        success: false,
        message: "Bank details already exist for this user"
      });
    }

    // Validate account with Paystack (optional - can be skipped for MVP)
    try {
      const accountValidation = await resolveAccount(accountNumber, bankName);
      if (!accountValidation.status) {
        return res.status(400).json({
          success: false,
          message: "Invalid account details"
        });
      }
    } catch (error) {
      console.log("Paystack validation failed, proceeding with manual input");
    }

    // Validate BVN with Paystack (optional - can be skipped for MVP)
    try {
      const bvnValidation = await validateBVN(bvn);
      if (!bvnValidation.status) {
        return res.status(400).json({
          success: false,
          message: "Invalid BVN"
        });
      }
    } catch (error) {
      console.log("BVN validation failed, proceeding with manual input");
    }

    // Create bank details
    const bankDetails = await Bank.create({
      userId,
      bankName,
      accountName,
      accountNumber,
      bvn
    });

    res.status(201).json({
      success: true,
      message: "Bank details added successfully",
      data: {
        id: bankDetails._id,
        bankName: bankDetails.bankName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        createdAt: bankDetails.createdAt
      }
    });

  } catch (error) {
    console.error("Add bank details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* =======================
   GET BANK DETAILS
======================= */
exports.getBankDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const bankDetails = await Bank.findOne({ userId });
    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: "Bank details not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: bankDetails._id,
        bankName: bankDetails.bankName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        createdAt: bankDetails.createdAt
      }
    });

  } catch (error) {
    console.error("Get bank details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
