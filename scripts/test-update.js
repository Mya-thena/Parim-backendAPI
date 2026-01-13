const axios = require('axios');
const mongoose = require('mongoose');
const Admin = require('../src/models/admin.model');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function setupAdmin() {
    await mongoose.connect(process.env.MONGO_URI);
    const adminEmail = `admin_${Date.now()}@test.com`;
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.create({
        fullName: 'Test Admin',
        mail: adminEmail,
        password: hashedPassword,
        phoneNumber: '9999999999',
        role: 'admin',
        isVerified: true,
        isActive: true
    });
    return { adminEmail, password };
}

const runTest = async () => {
    try {
        console.log('🚀 TESTING SPRINT 2 - EDIT/UPDATE FEATURES');
        const { adminEmail, password } = await setupAdmin();

        // 1. Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            mail: adminEmail, password: password, userType: 'admin'
        });
        const token = loginRes.data.data.tokens.accessToken;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Admin Logged In');

        // 2. Create Event
        const eventRes = await axios.post(`${API_URL}/events`, {
            title: "Original Title",
            shortDescription: "Original Short",
            longDescription: "Original Long",
            location: { address: "Old Addr", state: "Lagos" },
            eventDate: { start: new Date(), end: new Date() }
        }, config);
        const eventId = eventRes.data.data.event._id;
        console.log('✅ Event Created');

        // 3. Update Event
        const updateEventRes = await axios.patch(`${API_URL}/events/${eventId}`, {
            title: "Updated Title",
            location: { address: "New Addr", state: "Abuja" }
        }, config);
        if (updateEventRes.data.data.event.title !== "Updated Title") throw new Error("Event Update Failed");
        console.log('✅ Event Updated Successfully');

        // 4. Create Role
        const roleRes = await axios.post(`${API_URL}/events/${eventId}/roles`, {
            roleName: "Original Role",
            price: 5000,
            capacity: 10
        }, config);
        const roleId = roleRes.data.data.role._id;
        console.log('✅ Role Created');

        // 5. Update Role
        const updateRoleRes = await axios.patch(`${API_URL}/events/roles/${roleId}`, {
            roleName: "Updated Role",
            price: 10000
        }, config);
        if (updateRoleRes.data.data.role.price !== 10000) throw new Error("Role Update Failed");
        console.log('✅ Role Updated Successfully');

        console.log('\n🎉 EDIT/UPDATE VERIFICATION SUCCESSFUL! 🎉');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED ❌');
        console.error(error.response?.data || error.message);
        process.exit(1);
    }
};

runTest();
