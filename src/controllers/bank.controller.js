const Bank = require("../models/bank.model");
const { resolveAccount, validateBVN } = require("../services/paystack.service");

/* =======================
   ADD BANK DETAILS
======================= */
exports.addBankDetails = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { bankName, accountName, accountNumber } = req.body;

    // Validate input
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        message: "Bank name, account number, and account name are required"
      });
    }

    // Validate account number length (10 digits)
    if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: "Account number must be exactly 10 digits"
      });
    }

    // Upsert bank details (Update if exists, Create if not)
    const bankDetails = await Bank.findOneAndUpdate(
      { userId },
      {
        userId,
        bankName,
        accountName,
        accountNumber
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: {
        id: bankDetails._id,
        bankName: bankDetails.bankName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        createdAt: bankDetails.createdAt,
        updatedAt: bankDetails.updatedAt
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
