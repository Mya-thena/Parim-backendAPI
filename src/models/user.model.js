const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    mail: {
      type: String,
      required: true,
      unique: true,
    },

    phoneNumber: {
      type: String,
      required: true
    },

    password: {
      type: String,
      required: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    otp: String,
    otpExpiresAt: Date
  },
  { timestamps: true }
  
);



/**
 * 🔑 THIS LINE PREVENTS OverwriteModelError
 */
module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
