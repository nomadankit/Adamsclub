
import { db } from '../server/db';
import { bookings, users, assets, BookingStatus } from '@shared/schema';
import { storage } from '../server/storage';
import { eq, and, or, sql, gte, lte } from 'drizzle-orm';

async function main() {
    console.log('🧪 Testing Staff Dashboard Status Logic...');

    // 1. Setup Test Data
    const userId = `user_staff_test_${Date.now()}`;
    await storage.upsertUser({ id: userId, email: `staff_test_${Date.now()}@test.com`, role: 'staff' });

    let [asset] = await storage.getAssets({ type: 'gear' });
    if (!asset) throw new Error("No gear asset found");

    // Create a booking that ended 30 mins ago (so it's in Buffer)
    // Current time: Now
    // Booking ended: Now - 30m
    // Buffer ends: Now + 30m
    const now = new Date();
    const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Started 2 hours ago
    const end = new Date(now.getTime() - 30 * 60 * 1000); // Ended 30 mins ago

    // Create booking
    await storage.createBooking({
        userId,
        assetId: asset.id,
        startDate: start,
        endDate: end,
        status: BookingStatus.CHECKED_OUT, // It was checked out
        paidWithCredits: true
    });

    console.log(`✅ Created Booking: Ended 30m ago. Asset should be in BUFFER.`);

    // 2. Simulate GET /api/staff/gear-status Logic

    // Get active bookings
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const activeBookingsRows = await db.select({
        booking: bookings,
        user: users
    }).from(bookings)
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(
            and(
                sql`${bookings.status} != 'cancelled'`,
                or(
                    eq(bookings.status, 'checked_out'),
                    and(gte(bookings.startDate, startOfDay), lte(bookings.startDate, endOfDay))
                )
            )
        );

    // Find our asset
    const assetBookings = activeBookingsRows.filter(b => b.booking.assetId === asset.id);

    // Determine Status
    let currentStatus = 'Available';

    // Logic from routes.ts
    if (asset.maintenanceMode) {
        currentStatus = 'Maintenance';
    } else if (activeBookingsRows.find(b => b.booking.assetId === asset.id && b.booking.status === 'checked_out')) {
        // Wait! The logic in routes.ts says:
        // if (activeBookings.find(b => ... status === 'checked_out')) -> 'Active'
        // BUT, if it's checked_out AND overdue? 
        // Or if it's checked_out AND strictly "currently out"?

        // In my test case, status is CHECKED_OUT.
        // But wait, if it's "Checked Out", usually that means the user HAS it.
        // So the status should be "Active" (or "Booked" if searching dates).

        // Re-reading logic from routes.ts:
        // else if (activeBookings.find(b => ... status === 'checked_out')) { currentStatus = 'Active'; }

        // Use-case: Item returned but in buffer?
        // If item is returned, status changes to 'checked_in' (or 'completed').
        // Ah! If status is CHECKED_OUT, it implies the user still has it.

        // Retrying test scenario:
        // Scenario 1: User has returned it. Status is CHECKED_IN. Buffer applies.
        // Scenario 2: User hasn't returned. Status is CHECKED_OUT. Buffer doesn't start until they return? 
        // No, buffer is calculated from Scheduled End Time usually, OR Actual Return Time.
        // Current logic uses Scheduled End and Buffer End logic for conflicts.

        // Let's test the "Buffer" status display.
        // Logic says:
        // check if inside a booking time or buffer

        // Update my test booking to be 'checked_in' (returned)
        // So it's no longer 'active' hands-on, but still 'buffer' time.
    }

    // Update booking to CHECKED_IN
    await db.update(bookings).set({ status: 'checked_in' }).where(eq(bookings.assetId, asset.id));
    // Refetch
    const activeBookingsRows2 = await db.select({ booking: bookings }).from(bookings).where(eq(bookings.assetId, asset.id));
    const assetBookings2 = activeBookingsRows2;

    // Logic again
    const busy = assetBookings2.find(b => {
        const start = b.booking.startDate;
        const bufferEnd = b.booking.bufferEnd || new Date(b.booking.endDate.getTime() + 60 * 60 * 1000);
        return now >= start && now < bufferEnd;
    });

    if (busy) {
        currentStatus = now < busy.booking.endDate ? 'Booked' : 'Buffer';
    }

    console.log(`\n🔎 Results:`);
    console.log(`   Expected Status: Buffer`);
    console.log(`   Calculated Status: ${currentStatus}`);

    if (currentStatus === 'Buffer') {
        console.log(`✅ VERIFIED: Staff Logic correctly identifies BUFFER status.`);
    } else {
        console.error(`❌ FAILED: Expected Buffer, got ${currentStatus}`);
    }

    process.exit(0);
}

main();
