const express = require("express");
const router = express.Router();
const bankController = require("../../controllers/bank.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.post("/add", protect, bankController.addBankDetails);
router.get("/", protect, bankController.getBankDetails);

module.exports = router;
