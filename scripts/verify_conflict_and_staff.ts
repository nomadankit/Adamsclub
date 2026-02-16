
import { db } from "../server/db";
// We can use fetch directly since we are on Node v24
import { users } from "../shared/schema";

async function verifyConflictAndStaff() {
    console.log('🔹 STARTING VERIFICATION: Conflict & Staff View (via fetch)');
    const BASE_URL = 'http://127.0.0.1:5000';
    let cookie = '';

    try {
        // --- STEP 1: Verify User 2 sees conflict ---
        console.log('\n--- Step 1: User 2 Conflict Check ---');

        // Login User 2
        console.log('Logging in as User 2...');
        let res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'user2@test.com', password: 'password123' })
        });

        if (res.status !== 200) throw new Error(`User 2 Login Failed: ${res.status}`);

        // Capture cookie manually if needed, though fetch might not persist it automatically in all envs without a jar.
        // Node native fetch doesn't have a cookie jar by default.
        // We need to extract 'set-cookie' and send it back.
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) cookie = setCookie;

        console.log('✅ User 2 Logged In.');

        // Check Availability for Feb 7th, 2026
        const targetDate = '2026-02-07';
        console.log(`Checking availability for ${targetDate}...`);

        res = await fetch(`${BASE_URL}/api/availability?date=${targetDate}`, {
            headers: { 'Cookie': cookie }
        });

        if (res.status !== 200) throw new Error(`Get Availability Failed: ${res.status}`);

        const slots: any[] = await res.json();
        // Search for 10:00 AM slot
        const slot10 = slots.find((s: any) => s.time === '10:00');

        if (!slot10) {
            console.error('❌ Slot 10:00 not found in response.');
        } else {
            console.log(`Slot 10:00 Status: ${slot10.status}`);
            if (slot10.status === 'booked' || slot10.status === 'unavailable') {
                console.log('✅ SUCCESS: 10:00 AM slot is BLOCKED for User 2.');
            } else {
                console.error('❌ FAILURE: 10:00 AM slot is AVAILABLE logic failed.');
                console.log('Full Slot Data:', slot10);
            }
        }

        // Logout
        await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', headers: { 'Cookie': cookie } });
        cookie = ''; // Clear cookie

        // --- STEP 2: Verify Staff Dashboard ---
        console.log('\n--- Step 2: Staff Dashboard Check ---');

        // Login Admin
        console.log('Logging in as Admin...');
        res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin@adamsclub.com', password: 'admin123' })
        });

        if (res.status !== 200) throw new Error(`Admin Login Failed: ${res.status}`);
        const adminCookie = res.headers.get('set-cookie');
        if (adminCookie) cookie = adminCookie;
        console.log('✅ Admin Logged In.');

        // Fetch Bookings
        console.log('Fetching /api/bookings (Admin Check)...');
        res = await fetch(`${BASE_URL}/api/bookings`, {
            headers: { 'Cookie': cookie }
        });

        if (res.status !== 200) console.log(`Warning: /api/bookings returned ${res.status}`);

        const allBookings: any[] = await res.json();
        const targetBooking = allBookings.find((b: any) =>
            b.startDate && b.startDate.includes('2026-02-07') &&
            b.startTime === '10:00'
        );

        if (targetBooking) {
            console.log('✅ SUCCESS: Found User 1\'s booking in Admin list.');
            console.log('Booking Details:', {
                id: targetBooking.id,
                item: targetBooking.assetId,
                status: targetBooking.status
            });
        } else {
            console.error('❌ FAILURE: Did not find the booking in /api/bookings.');
        }

    } catch (err: any) {
        console.error('🚨 SCRIPT ERROR:', err.message);
    }
}

verifyConflictAndStaff();
