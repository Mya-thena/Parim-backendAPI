const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrphans() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = require('./src/models/user.model');
        const Participant = require('./src/models/participant.model');
        const Attendance = require('./src/models/attendance.model');
        const Bank = require('./src/models/bank.model');

        const models = [
            { name: 'Participant', model: Participant, field: 'staffId' },
            { name: 'Attendance', model: Attendance, field: 'staffId' },
            { name: 'Bank', model: Bank, field: 'userId' }
        ];

        for (const { name, model, field } of models) {
            console.log(`Checking for orphans in ${name}...`);
            const records = await model.find().lean();
            const orphanIds = [];

            for (const record of records) {
                const userId = record[field];
                if (userId) {
                    const userExists = await User.countDocuments({ _id: userId });
                    if (userExists === 0) {
                        orphanIds.push(record._id);
                    }
                }
            }

            if (orphanIds.length > 0) {
                console.log(`❌ Found ${orphanIds.length} orphans in ${name}.`);
                // Uncomment to delete
                // await model.deleteMany({ _id: { $in: orphanIds } });
                // console.log(`Deleted orphans from ${name}.`);
            } else {
                console.log(`✅ No orphans found in ${name}.`);
            }
        }

    } catch (error) {
        console.error('Orphan check error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkOrphans();
