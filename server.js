require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db");

const app = express();

// Connect database
connectDB();


// Middleware
app.use(express.json());

// Import auth routes
const path = require("path");
const authRoutes = require(path.join(__dirname, "src", "modules", "auth", "auth.routes"));
app.use("/api/auth", authRoutes);


// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Parim Pro backend is running 🚀",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
