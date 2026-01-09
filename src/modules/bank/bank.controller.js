const Bank = require("../../models/bank.model");
const User = require("../../models/user.model");

exports.addBankDetails = async (req, res) => {
  try {
    const { bankName, accountNumber, accountName } = req.body;
    const userId = req.user.id;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        message: "All bank fields are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const existingBank = await Bank.findOne({ userId });
    if (existingBank) {
      return res.status(400).json({
        success: false,
        message: "Bank details already added"
      });
    }

    await Bank.create({
      userId,
      bankName,
      accountNumber,
      accountName
    });

    return res.status(201).json({
      success: true,
      message: "Bank details saved successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to save bank details"
    });
  }
};
