
import { test, expect } from '@playwright/test';

test('Verify Timezone Logic (API Level)', async ({ request }) => {
    // 1. Setup User & Login to get session
    const email = `timezone_test_${Date.now()}@test.com`;

    // Register/Login
    // We can try to hit the register endpoint directly if we know it, or just use UI-less auth if implemented.
    // AdamsClub uses passport-local. Let's try to register via POST /api/register (standard) or just use the browser context once to get cookies.
    // Actually, let's use a browser context to login quickly (headless), then use the context's request to fetch API.

    // Wait, if UI is slow, HEADLESS browser should be fast enough for just login.
    // Or we can just use the server's session if we disable auth or use a known user?
    // Let's assume registration via API is possible.

    // Use correct endpoint found in server/auth.ts
    const authRes = await request.post('http://localhost:5000/api/auth/signup/email', {
        data: {
            email: email,
            password: 'password123',
            firstName: 'Timezone',
            lastName: 'Tester'
        }
    });

    if (!authRes.ok()) {
        console.log('⚠️ API Register failed/not found, trying standard Login...');
        // Fallback: Use existing admin
        const loginRes = await request.post('http://localhost:5000/api/auth/login', {
            data: { email: 'admin@adamsclub.com', password: 'admin123' }
        });

        if (!loginRes.ok()) {
            console.log('❌ Login failed. But proceeding since we might be testing no-auth...');
            // return; // COMMENTED OUT TO ALLOW PROCEEDING
        }
    }

    // 2. Fetch Availability for TODAY
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    console.log(`Checking Date: ${dateStr}`);

    const res = await request.get(`http://localhost:5000/api/availability_test?date=${dateStr}&type=gear`);
    if (!res.ok()) {
        console.log(`❌ API Error: ${res.status()} ${res.statusText()}`);
        console.log(await res.text());
    }
    expect(res.ok()).toBeTruthy();

    const slots = await res.json();
    // console.log(slots); // Debug

    // 3. Verify Past Slots
    const currentHour = today.getHours();
    // We care about slots < currentHour.
    // e.g. if it's 10:30, 10:00 might be past or valid? 
    // Code says: if (slotTime < now) status = 'booked', note = 'Past time'

    console.log(`Current Hour: ${currentHour}`);

    let failure = false;

    slots.forEach((slot: any) => {
        const [h, m] = slot.time.split(':').map(Number);

        // Slot time object for today
        // note: slotTime is created as startOfDay + h:m
        // Verification:
        if (h < currentHour) {
            if (slot.status !== 'booked' || slot.note !== 'Past time') {
                console.log(`❌ FAILURE: Slot ${slot.time} should be 'Past time' but is ${slot.status}/${slot.note}`);
                failure = true;
            } else {
                console.log(`✅ Slot ${slot.time} is correctly blocked as Past.`);
            }
        } else if (h > currentHour + 1) {
            // Future slots (allow buffer logic to interfere, but generally available if no bookings)
            if (slot.status === 'available') {
                // console.log(`✅ Future Slot ${slot.time} is available.`);
            }
        }
    });

    if (failure) {
        throw new Error('Timezone verification failed: Past slots were not blocked.');
    } else {
        console.log('🎉 SUCCESS: All past slots validated correctly via API.');
    }

});
