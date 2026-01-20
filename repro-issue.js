const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/user.model');

async function repro() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create a few users to get the count up
        console.log('Creating initial users...');
        const user1 = await User.create({
            fullName: "Test User 1",
            mail: `test1_${Date.now()}@example.com`,
            phoneNumber: "08011111111",
            password: "password123",
            isVerified: true
        });
        console.log(`Created ${user1.fullName} with staffId: ${user1.staffId}`);

        const user2 = await User.create({
            fullName: "Test User 2",
            mail: `test2_${Date.now()}@example.com`,
            phoneNumber: "08022222222",
            password: "password123",
            isVerified: true
        });
        console.log(`Created ${user2.fullName} with staffId: ${user2.staffId}`);

        // 2. Delete the FIRST user
        console.log(`Deleting ${user1.fullName}...`);
        await User.findByIdAndDelete(user1._id);

        // 3. Try to create a new user - this should fail if logic uses countDocuments()
        console.log('Attempting to create a new user (which might trigger duplicate staffId)...');
        try {
            const user3 = await User.create({
                fullName: "Test User 3",
                mail: `test3_${Date.now()}@example.com`,
                phoneNumber: "08033333333",
                password: "password123",
                isVerified: true
            });
            console.log(`Successfully created ${user3.fullName} with staffId: ${user3.staffId}`);
            console.log('WARNING: The issue did not reproduce. Maybe there are other factors.');
        } catch (err) {
            if (err.code === 11000 && err.message.includes('staffId')) {
                console.log('✅ REPRODUCED: Duplicate staffId error caught as expected!');
            } else {
                console.error('Unexpected error:', err);
            }
        }

    } catch (error) {
        console.error('Repro script error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

repro();
