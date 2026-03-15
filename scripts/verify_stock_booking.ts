
import { db } from "../server/db";
import { assets, locationInventory, bookings, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "../server/storage";

async function verifyStockBooking() {
    const storage = new DatabaseStorage();
    console.log("Starting Stock Booking Verification...");

    // 1. Setup: Create Test Asset with Quantity 3
    console.log("Creating test asset...");
    const [asset] = await db.insert(assets).values({
        name: "High Demand Item",
        description: "Stock Limited Item",
        type: "gear",
        category: "Test",
        isAvailable: true,
        mainPrice: 10,
    }).returning();

    // Create inventory for it (assuming a locationId=1 exists, or we create one)
    // Let's assume locationId=1 exists. If not, we might fail.
    // Ideally we should find a location first.
    const locations = await db.query.locations.findMany({ limit: 1 });
    let locationId = locations[0]?.id;

    if (!locationId) {
        const [loc] = await db.insert(require("@shared/schema").locations).values({
            name: "Test Location",
            code: "LOC_TEST",
        }).returning();
        locationId = loc.id;
    }

    await db.insert(locationInventory).values({
        locationId,
        assetId: asset.id,
        quantity: 3, // STOCK LIMIT IS 3
    });

    console.log(`Created Asset ${asset.id} with Stock 3 at Location ${locationId}`);

    // 2. Create 3 Active Bookings
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM

    const endDate = new Date(tomorrow);
    endDate.setHours(12, 0, 0, 0); // 12:00 PM (2 hours)

    // Need a user
    const allUsers = await db.select().from(users).limit(1);
    const userId = allUsers[0].id;

    console.log("Creating 3 concurrent bookings...");
    for (let i = 0; i < 3; i++) {
        await storage.createBooking({
            userId,
            assetId: asset.id,
            status: "active",
            startDate: tomorrow,
            endDate: endDate,
            totalAmount: 0,
            creditsUsed: "0",
            paidWithCredits: false,
        });
    }
    console.log("3 bookings created.");

    // 3. Attempt 4th Booking (Should Fail)
    console.log("Attempting 4th booking (Should Fail)...");
    const conflicts = await storage.checkBookingConflicts(asset.id, tomorrow, endDate);

    if (conflicts) {
        console.log("SUCCESS: 4th booking blocked by stock limit.");
    } else {
        console.error("FAILURE: 4th booking was NOT blocked!");
        process.exit(1);
    }

    // 4. Attempt Booking after return time (Should Succeed)
    console.log("Attempting booking after return time (13:00)...");
    const laterStart = new Date(tomorrow);
    laterStart.setHours(13, 0, 0, 0);
    const laterEnd = new Date(tomorrow);
    laterEnd.setHours(15, 0, 0, 0);

    // Buffer is 1 hour. Booking ends 12:00. Buffer ends 13:00.
    // So 13:00 start should be valid.
    const laterConflicts = await storage.checkBookingConflicts(asset.id, laterStart, laterEnd);

    if (!laterConflicts) {
        console.log("SUCCESS: later booking allowed.");
    } else {
        console.error("FAILURE: later booking blocked unexpectedly!");
        process.exit(1);
    }

    // Cleanup
    console.log("Cleaning up...");
    await db.delete(bookings).where(eq(bookings.assetId, asset.id));
    await db.delete(locationInventory).where(eq(locationInventory.assetId, asset.id));
    await db.delete(assets).where(eq(assets.id, asset.id));
    console.log("Done.");
}

verifyStockBooking().catch(console.error);
