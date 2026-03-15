
import { db } from '../server/db';
import { bookings, BookingStatus, users } from '@shared/schema';
import { storage } from '../server/storage';
import { eq } from 'drizzle-orm';

const USER_ID = 'f47e5b24-3f6e-4fd6-ac57-112f200ac092';

async function main() {
    console.log('🚀 Starting booking reproduction script...');

    try {
        // 1. Check user
        const user = await storage.getUser(USER_ID);
        if (!user) throw new Error('User not found');
        console.log(`✅ User found: ${user.email}, Credits: ${user.adamsCredits}`);

        // 2. Mock parameters
        const benefitId = 'kayak-premium';
        const date = '2025-06-01';
        const time = '14:00';
        const cost = 20;

        // 3. Deduct credits
        console.log('💸 Attempting to spend credits...');

        // Check balance first
        if (Number(user.adamsCredits) < cost) {
            console.error('❌ Insufficient credits');
            return;
        }

        try {
            await storage.spendCredits(
                user.id,
                cost,
                `Booking Test: ${benefitId}`,
                undefined,
                undefined
            );
            console.log('✅ Credit deduction SUCCESS');
        } catch (spendError) {
            console.error('❌ Credit deduction FAILED:', spendError);
            return; // Stop if spend fails
        }

        // 4. Prepare booking data
        const bookingId = `booking_test_${Date.now()}`;
        const qrCode = `QR-TEST-${Date.now()}`;
        const startDateTime = new Date(`${date}T${time}:00`);

        console.log(`📅 Date object: ${startDateTime.toISOString()}`);
        console.log(`🆔 Booking ID: ${bookingId}`);

        // 5. Attempt Insert
        console.log('💾 Attempting DB Insert...');

        try {
            await db.insert(bookings).values({
                id: bookingId,
                userId: user.id,
                assetId: benefitId, // 'kayak-premium' must exist in assets table
                status: BookingStatus.CONFIRMED,
                startDate: startDateTime,
                endDate: startDateTime,
                qrCode,
                creditsUsed: cost.toFixed(2),
                paidWithCredits: cost > 0,
            });
            console.log('✅ DB Insert SUCCESS!');
        } catch (dbError) {
            console.error('❌ DB Insert FAILED:', dbError);
        }

    } catch (err) {
        console.error('❌ Script Error:', err);
    }
    process.exit(0);
}

main();
