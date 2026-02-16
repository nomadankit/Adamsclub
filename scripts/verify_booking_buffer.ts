
import { db } from '../server/db';
import { bookings, BookingStatus, users, assets } from '@shared/schema';
import { storage } from '../server/storage';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🧪 Starting Booking Buffer Verification...');

    try {
        // 1. Setup Test User
        const email = `test_buffer_${Date.now()}@example.com`;
        const userId = `user_${Date.now()}`; // Simple unique ID
        const user = await storage.upsertUser({
            id: userId,
            email,
            password: 'password123',
            firstName: 'Test',
            lastName: 'Buffer',
            role: 'member',
            adamsCredits: '1000'
        });
        console.log(`✅ Test User Created: ${user.id}`);

        // 2. Setup Test Asset
        // Ensure we have at least one 'gear' asset
        let [asset] = await storage.getAssets({ type: 'gear' });
        if (!asset) {
            console.log('ℹ️ No gear asset found, creating one...');
            asset = await storage.createAsset({
                name: 'Test Kayak 1',
                type: 'gear',
                category: 'Water Sports',
                status: 'available',
                cost: 10
            });
        }
        console.log(`✅ Test Asset Used: ${asset.id} (${asset.name})`);

        // 3. Create Booking (10:00 - 13:00)
        // Use a date far in the future to avoid conflicts with real data
        const dateStr = '2026-06-01';
        const startDate = new Date(`${dateStr}T10:00:00`);
        const endDate = new Date(`${dateStr}T13:00:00`);

        // Clean up any existing bookings for this asset/time (idempotency)
        // (Skipping cleanup for simplicity, relying on fresh user/random ID or specific time)

        const booking = await storage.createBooking({
            userId: user.id,
            assetId: asset.id,
            startDate,
            endDate,
            status: BookingStatus.CONFIRMED,
            paidWithCredits: true,
            creditsUsed: '10',
            locationId: 'loc1', // dummy
            qrCode: 'test-qr'
        });

        console.log(`✅ Booking Created: ${booking.id}`);
        console.log(`   Start: ${booking.startDate.toISOString()}`);
        console.log(`   End:   ${booking.endDate.toISOString()}`);
        console.log(`   Buffer:${booking.bufferEnd?.toISOString()}`);

        // Verify Buffer Calculation
        const expectedBuffer = new Date(endDate.getTime() + 60 * 60 * 1000);
        if (booking.bufferEnd?.getTime() !== expectedBuffer.getTime()) {
            console.error('❌ Buffer Calculation FAILED');
            console.error(`Expected: ${expectedBuffer.toISOString()}, Got: ${booking.bufferEnd?.toISOString()}`);
        } else {
            console.log('✅ Buffer Calculation CORRECT (End + 1hr)');
        }

        // 4. Test Overlap/Buffer Conflict (13:30 - 14:30)
        // Should conflict because 13:30 is inside the 13:00-14:00 buffer window?
        // Wait, "Asset Busy" means [Start, BufferEnd].
        // 13:30 is inside [10:00, 14:00]. So YES, it should conflict.

        const conflictStart = new Date(`${dateStr}T13:30:00`);
        const conflictEnd = new Date(`${dateStr}T14:30:00`);
        const hasConflict = await storage.checkBookingConflicts(asset.id, conflictStart, conflictEnd); // Do not exclude self, we want to see if it conflicts!

        if (hasConflict) {
            console.log('✅ Conflict Check CORRECT: 13:30 start is blocked by buffer.');
        } else {
            console.error('❌ Conflict Check FAILED: 13:30 start should be blocked!');
        }

        // 5. Test Availability after Buffer (14:00 - 15:00)
        // Should be free.
        const cleanStart = new Date(`${dateStr}T14:00:00`);
        const cleanEnd = new Date(`${dateStr}T15:00:00`);
        const hasConflict2 = await storage.checkBookingConflicts(asset.id, cleanStart, cleanEnd, booking.id);

        if (!hasConflict2) {
            console.log('✅ Conflict Check CORRECT: 14:00 start is allowed.');
        } else {
            console.error('❌ Conflict Check FAILED: 14:00 start should be allowed!');
        }

        // 6. Test findAvailableAsset
        // Should NOT find this asset for 13:30
        const foundBusy = await storage.findAvailableAsset('gear', conflictStart, conflictEnd);
        // We need to be careful if there are OTHER assets. 
        // If this is the *only* asset, it should be undefined.
        // If there are others, we check if THIS asset is returned.

        if (foundBusy?.id === asset.id) {
            console.error('❌ findAvailableAsset FAILED: Returned booked asset!');
        } else {
            console.log(`✅ findAvailableAsset CORRECT for busy slot (Did not return ${asset.id})`);
        }

        // Should find this asset for 14:00 (assuming no other bookings)
        const foundFree = await storage.findAvailableAsset('gear', cleanStart, cleanEnd);
        // It might return another asset if multiple exist, but at least it should return SOMETHING
        // and if verify specifically against our asset:
        // We can manually check logic or trust the query above.

        console.log(`ℹ️ Asset returned for 14:00: ${foundFree?.id}`);


    } catch (err) {
        console.error('❌ Script Error:', err);
    }
    process.exit(0);
}

main();
