const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Drop unique index on qrcodes collection if it exists
    try {
      const qrcodeCollection = mongoose.connection.collection('qrcodes');
      const indexes = await qrcodeCollection.indexes();
      if (indexes.find(idx => idx.name === 'eventId_1' && idx.unique)) {
        await qrcodeCollection.dropIndex('eventId_1');
        console.log("🗑️ Dropped stale unique index on qrcodes");
      }
    } catch (idxErr) {
      // Ignore errors if collection doesn't exist yet
    }
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

