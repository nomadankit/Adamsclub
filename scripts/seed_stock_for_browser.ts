
import { db } from "../server/db";
import { assets, locationInventory, bookings, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "../server/storage";

async function seedStockForBrowser() {
    const storage = new DatabaseStorage();
    console.log("Seeding Stock for Browser Verification...");

    // 1. Create Test Asset "High Demand Kayak" with Quantity 3
    // First check if it exists to avoid dupes if run multiple times
    const existing = await db.select().from(assets).where(eq(assets.name, "High Demand Kayak"));

    let assetId;
    if (existing.length > 0) {
        assetId = existing[0].id;
        console.log(`Asset already exists: ${assetId}`);

        // Ensure inventory is 3
        // We need locationId
        const locations = await db.query.locations.findMany({ limit: 1 });
        if (locations.length > 0) {
            await db.update(locationInventory)
                .set({ quantity: 3 })
                .where(eq(locationInventory.assetId, assetId));
        }
    } else {
        const [asset] = await db.insert(assets).values({
            name: "High Demand Kayak",
            description: "Browser Test Item",
            type: "kayak", // Matches UI icon logic
            category: "Water Sports",
            isAvailable: true,
            mainPrice: 20,
        }).returning();
        assetId = asset.id;

        // Create inventory
        const locations = await db.query.locations.findMany({ limit: 1 });
        let locationId = locations[0]?.id;

        if (!locationId) {
            // Create location if needed
            const [loc] = await db.insert(require("@shared/schema").locations).values({
                name: "Test Location",
                code: "LOC_TEST",
            }).returning();
            locationId = loc.id;
        }

        await db.insert(locationInventory).values({
            locationId,
            assetId: asset.id,
            quantity: 3,
        });
        console.log(`Created Asset ${assetId} with Stock 3`);
    }

    // 2. Create 3 Active Bookings for TOMORROW 10:00 - 12:00
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const startTime = new Date(tomorrow);
    startTime.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(12, 0, 0, 0);

    // Clear existing bookings for this asset tomorrow to ensure clean slate
    // Actually, identifying them is hard without ID.
    // But let's just add them.

    // Need a user
    const allUsers = await db.select().from(users).limit(1);
    const userId = allUsers[0].id;

    console.log(`Creating 3 bookings for ${dateStr} 10:00-12:00...`);
    for (let i = 0; i < 3; i++) {
        await storage.createBooking({
            userId,
            assetId: assetId,
            status: "active",
            startDate: startTime, // All 3 overlap exactly
            endDate: endTime,
            totalAmount: 0,
            creditsUsed: "0",
            paidWithCredits: false,
        });
    }
    console.log("Seeding Complete. Test Asset: High Demand Kayak");
}

seedStockForBrowser().catch(console.error);
