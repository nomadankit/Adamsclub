import { db } from '../server/db';
import { bookings } from '@shared/schema';
import { desc } from 'drizzle-orm';

async function testTokenFlow() {
    console.log("🚀 Starting Token Flow HTTP Integration Test");

    const BASE_URL = 'http://localhost:5000';

    try {
        // 1. Get a recent booking to return
        const recentBooking = await db.query.bookings.findFirst({
            where: (bookings, { isNotNull }) => isNotNull(bookings.qrCode),
            orderBy: [desc(bookings.createdAt)]
        });

        if (!recentBooking) {
            console.error("❌ No booking found to test.");
            process.exit(1);
        }

        console.log(`✅ Using Booking: ${recentBooking.id} / ${recentBooking.qrCode}`);

        // 2. Login as Staff
        console.log("🔐 Logging in as Staff...");
        let res = await fetch(`${BASE_URL}/api/auth/dev-login/demo_staff@test.com`, { redirect: 'manual' });
        const staffCookies = res.headers.get('set-cookie');

        if (!staffCookies) throw new Error("Staff login failed");

        // 3. Start Booking to make it active
        console.log("▶️ Starting booking...");
        const startRes = await fetch(`${BASE_URL}/api/staff/checkouts/${recentBooking.id}`, {
            method: 'POST',
            headers: { 'Cookie': staffCookies }
        });
        if (startRes.status !== 200) {
            console.error(`❌ Start failed with status ${startRes.status}:`, await startRes.text());
        }

        // 3. Execute Return as Staff
        console.log("📦 Returning as EXCELLENT...");
        const returnRes = await fetch(`${BASE_URL}/api/staff/bookings/${recentBooking.id}/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': staffCookies
            },
            body: JSON.stringify({
                condition: 'EXCELLENT',
                condition_note: ''
            })
        });

        if (returnRes.status !== 200) {
            console.error(`❌ Return failed with status ${returnRes.status}:`, await returnRes.text());
            process.exit(1);
        }

        console.log("✅ Gear Return Processed.");

        // 4. Login as User
        console.log("🔐 Logging in as User...");
        res = await fetch(`${BASE_URL}/api/auth/dev-login/demo_user@test.com`, { redirect: 'manual' });
        const userCookies = res.headers.get('set-cookie');

        if (!userCookies) throw new Error("User login failed");

        // 5. Check Token History
        console.log("🔍 Checking Tokens History (simulating Member Dashboard poll)...");
        const tokenRes = await fetch(`${BASE_URL}/api/member/tokens/history`, {
            headers: {
                'Cookie': userCookies
            }
        });

        if (tokenRes.status !== 200) {
            console.error(`❌ Token check failed with status ${tokenRes.status}`);
            process.exit(1);
        }

        const history = await tokenRes.json();

        const tenSecondsAgo = Date.now() - 10000;
        const recentEarned = history.find((t: any) => t.type === 'EARNED' && new Date(t.createdAt).getTime() > tenSecondsAgo);

        if (recentEarned) {
            console.log(`🎉 SUCCESS: Found newly awarded token for ${recentEarned.amount}! Dashboard popup would trigger.`);
            process.exit(0);
        } else {
            console.error("❌ FAILED: No recent EARNED token transaction found in history.");
            console.log("Current history:", history);
            process.exit(1);
        }

    } catch (err) {
        console.error("Test Error:", err);
        process.exit(1);
    }
}

testTokenFlow();
