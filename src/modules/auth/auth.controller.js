const User = require("../user/user.module");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendOtpMail } = require("../../services/mail.service");

/* =======================
   CREATE ACCOUNT
======================= */
exports.createAccount = async (req, res) => {
  try {
    const {
      fullName,
      mail,
      phoneNumber,
      createPassword,
      confirmPassword
    } = req.body;

    // 1. Validate input
    if (!fullName || !mail || !phoneNumber || !createPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (createPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    // 2. Check existing user
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(createPassword, 10);

    // 4. Create user (NOT verified yet)
    await User.create({
      fullName,
      mail,
      phoneNumber,
      password: hashedPassword,
      isVerified: false
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please verify your email."
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =======================
   SEND OTP
======================= */
exports.sendOtp = async (req, res) => {
  try {
    const { mail } = req.body;

    if (!mail) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ mail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified"
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendOtpMail(user.mail, otp);

    return res.json({
      success: true,
      message: "OTP sent to your email"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =======================
   VERIFY OTP
======================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { mail, otp } = req.body;

    if (!mail || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ mail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (
      user.otp !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    // Verify account
    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: "Account verified successfully"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =======================
   LOGIN
======================= */
exports.login = async (req, res) => {
  try {
    const { mail, password } = req.body;

    if (!mail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ mail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          mail: user.mail
        }
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
