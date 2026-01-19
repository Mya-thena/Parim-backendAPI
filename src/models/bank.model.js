const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    bankName: {
      type: String,
      required: true
    },

    accountName: {
      type: String,
      required: true
    },


    accountNumber: {
      type: String,
      required: true,
      length: 10
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Bank", bankSchema);
