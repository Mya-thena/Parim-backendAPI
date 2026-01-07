const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

module.exports = router;



