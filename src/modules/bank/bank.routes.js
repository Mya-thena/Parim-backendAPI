const express = require("express");
const router = express.Router();
const bankController = require("./bank.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.post("/add", bankController.addBankDetails);

module.exports = router;
