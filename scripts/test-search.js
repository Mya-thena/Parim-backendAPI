const axios = require('axios');
const mongoose = require('mongoose');
const Admin = require('../src/models/admin.model');
const Event = require('../src/models/event.model');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function setup() {
    await mongoose.connect(process.env.MONGO_URI);
    // Cleanup previous test events if needed (optional)

    // Create Admin
    const email = `admin_search_${Date.now()}@test.com`;
    const password = 'password123';
    await Admin.create({
        fullName: 'Search Master',
        mail: email,
        password: await bcrypt.hash(password, 10),
        phoneNumber: "09099999999",
        role: 'admin',
        isVerified: true, isActive: true
    });
    return { email, password };
}

async function run() {
    try {
        console.log('🚀 TESTING SEARCH, PAGINATION & UNIQUE IDs');
        const { email, password } = await setup();

        // Login
        const { data: { data: { tokens: { accessToken: token } } } } = await axios.post(`${API_URL}/auth/login`, {
            mail: email, password, userType: 'admin'
        });
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Logged In');

        // Create 3 Events
        console.log('Creates events...');
        const locations = [
            { venue: "Hall A", state: "Lagos" },
            { venue: "Hall B", state: "Abuja" },
            { venue: "Center C", state: "Lagos" }
        ];

        for (let i = 0; i < 3; i++) {
            await axios.post(`${API_URL}/events`, {
                title: `Event ${i + 1}`, shortDescription: "Desc", longDescription: "Long Desc",
                bannerImage: "url",
                location: { address: "Addr", ...locations[i] },
                eventDate: { start: new Date(), end: new Date() }
            }, config);
        }

        // 1. Verify Unique ID exists
        const listRes = await axios.get(`${API_URL}/events?limit=10`, config);
        const events = listRes.data.data.events;
        const ev1 = events[0];
        if (!ev1.uniqueId || !ev1.uniqueId.startsWith('EVT-')) throw new Error("Unique ID not generated correctly");
        console.log(`✅ Unique ID Generated: ${ev1.uniqueId}`);

        // 2. Test Pagination
        const pagedRes = await axios.get(`${API_URL}/events?limit=2&page=1`, config);
        if (pagedRes.data.data.events.length !== 2) throw new Error("Pagination Limit failed");
        console.log('✅ Pagination Limit verified');

        // 3. Test Search (Venue)
        const venueSearch = await axios.get(`${API_URL}/events?search=Hall`, config);
        // Should find Hall A and Hall B (2 events)
        const hallEvents = venueSearch.data.data.events.filter(e => e.location.venue.includes('Hall'));
        if (hallEvents.length < 2) throw new Error("Venue Search failed");
        console.log('✅ Venue Search verified');

        // 4. Test Search (State)
        const stateSearch = await axios.get(`${API_URL}/events?search=Abuja`, config);
        if (stateSearch.data.data.events.length < 1) throw new Error("State Search failed");
        console.log('✅ State Search verified');

        // 5. Test Search (Unique ID)
        const idSearch = await axios.get(`${API_URL}/events?search=${ev1.uniqueId}`, config);
        if (idSearch.data.data.events.length !== 1) throw new Error("Unique ID Search failed");
        console.log('✅ Unique ID Search verified');

        // 6. Test Get by Unique ID Route
        const getRes = await axios.get(`${API_URL}/events/unique/${ev1.uniqueId}`, config);
        if (getRes.data.data.event._id !== ev1._id) throw new Error("Get by Unique ID route failed");
        console.log('✅ Get by Unique ID Route verified');

        console.log('\n🎉 ALL SEARCH FEATURES VERIFIED! 🎉');
        process.exit(0);

    } catch (e) {
        console.error('❌ TEST FAILED:', e.response?.data || e.message);
        process.exit(1);
    }
}

run();
