const mongoose = require('mongoose');
const Event = require('../src/models/event.model');
require('dotenv').config();

const migrateEvents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to DB');

        const events = await Event.find({});
        console.log(`Found ${events.length} events to check.`);

        for (const event of events) {
            let updated = false;

            // 1. Generate Unique ID if missing
            if (!event.uniqueId) {
                const random = Math.random().toString(36).substring(2, 7).toUpperCase();
                event.uniqueId = `EVT-${random}`;
                updated = true;
                console.log(`🔹 Generated ID for "${event.title}": ${event.uniqueId}`);
            }

            // 2. Add default Venue if missing
            if (!event.location.venue) {
                event.location.venue = "Not Specified";
                updated = true;
                console.log(`🔹 Added default venue for "${event.title}"`);
            }

            if (updated) {
                await event.save(); // Triggers validations and updates
                console.log(`✅ Saved: ${event.title}`);
            }
        }

        console.log('🎉 Migration Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrateEvents();
