const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const Admin = require('../src/models/admin.model');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function setupUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Create Verified Admin
        const adminEmail = `superadmin_${Date.now()}@test.com`;
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await Admin.create({
            fullName: 'Super Admin',
            mail: adminEmail,
            password: hashedPassword,
            phoneNumber: '9999999999',
            role: 'super_admin',
            isVerified: true,
            isActive: true
        });
        console.log(`Created Verified Admin: ${adminEmail}`);

        // 2. Create Verified Staff
        const staffEmail = `staff_${Date.now()}@test.com`;
        const staff = await User.create({
            fullName: "Test Staff",
            mail: staffEmail,
            password: hashedPassword,
            phoneNumber: "1234567890",
            isVerified: true,
            isActive: true
        });
        console.log(`Created Verified Staff: ${staffEmail}`);

        return { admin, staff, password };
    } catch (err) {
        console.error("Setup User Error:", err);
        throw err;
    }
}

const runSequence = async () => {
    let adminToken = '';
    let staffToken = '';
    let eventId = '';
    let roleId = '';

    try {
        console.log('🚀 Starting Sprint 2 Verification...');
        const { admin, staff, password } = await setupUsers();
        const adminEmail = admin.mail;
        const staffEmail = staff.mail;

        // 1. Login Admin
        console.log('\n--- 1. Admin Login ---');
        try {
            const adminLogin = await axios.post(`${API_URL}/auth/login`, {
                mail: adminEmail,
                password: password,
                userType: 'admin'
            });
            adminToken = adminLogin.data.data.tokens.accessToken;
            console.log('✅ Admin Logged In');
        } catch (e) {
            console.error('Admin Login Failed:', e.response?.data || e.message);
            throw e;
        }

        // 2. Create Event (Draft)
        console.log('\n--- 2. Create Event ---');
        const eventRes = await axios.post(`${API_URL}/events`, {
            title: `Sprint 2 Test Event ${Date.now()}`,
            shortDescription: "Testing Sprint 2",
            longDescription: "Long description for testing...",
            bannerImage: "https://via.placeholder.com/150",
            location: {
                address: "123 Test St",
                state: "Lagos"
            },
            eventDate: {
                start: new Date(),
                end: new Date(Date.now() + 86400000)
            }
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        eventId = eventRes.data.data.event._id;
        console.log('✅ Event Created:', eventId);

        // 3. Create Role
        console.log('\n--- 3. Create Role ---');
        const roleRes = await axios.post(`${API_URL}/events/${eventId}/roles`, {
            roleName: "Tester",
            roleDescription: "Testing role",
            price: 5000,
            capacity: 5
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        roleId = roleRes.data.data.role._id;
        console.log('✅ Role Created:', roleId);

        // 4. Publish Event
        console.log('\n--- 4. Publish Event ---');
        await axios.patch(`${API_URL}/events/${eventId}/status`, {
            status: 'published'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('✅ Event Published');

        // 5. Login Staff (Already created and verified)
        console.log('\n--- 5. Login Staff ---');
        const staffLogin = await axios.post(`${API_URL}/auth/login`, {
            mail: staffEmail,
            password: password
        });
        staffToken = staffLogin.data.data.tokens.accessToken;
        console.log('✅ Staff Logged In');

        // 6. List Events (Staff)
        console.log('\n--- 6. List Events (Staff) ---');
        const listRes = await axios.get(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        const found = listRes.data.data.events.find(e => e._id === eventId);
        if (!found) throw new Error("Published event not visible to staff!");
        console.log('✅ Published event visible');

        // 7. Apply to Event
        console.log('\n--- 7. Apply to Event ---');
        await axios.post(`${API_URL}/events/${eventId}/apply`, {
            roleId: roleId
        }, { headers: { Authorization: `Bearer ${staffToken}` } });
        console.log('✅ Applied successfully');

        // 8. Admin View Participants
        console.log('\n--- 8. Admin View Participants ---');
        const partRes = await axios.get(`${API_URL}/events/${eventId}/participants`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const groupedData = partRes.data.data;
        const participants = groupedData['Tester'];

        if (!participants || participants.length !== 1) throw new Error("Participant not found in Admin view");
        console.log('✅ Participant visible to Admin');

        console.log('\n🎉 SPRINT 2 VERIFICATION SUCCESSFUL! 🎉');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST FAILED ❌');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
};

runSequence();
