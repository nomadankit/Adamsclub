import { db } from "../server/db";
import { assets, bookings, locationInventory, BookingStatus } from "../shared/schema";
import { eq, and, or, gte, lte, inArray } from "drizzle-orm";

async function simulate() {
    const date = "2026-02-22";
    const type = "";
    const category = undefined;

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Get all assets of the requested type/category
    let assetQuery = db.select().from(assets).where(eq(assets.isAvailable, true));

    if (type && type !== 'all') {
        assetQuery = db.select().from(assets).where(and(eq(assets.isAvailable, true), eq(assets.type, type as string)));
    }

    const allAssets = await assetQuery;
    console.log(`Initial assets count: ${allAssets.length}`);

    // Filter by category if provided
    const filteredAssets = category
        ? allAssets.filter(a => a.category === category)
        : allAssets;

    const availabilityResults = [];

    for (const asset of filteredAssets) {
        // 2. Get total stock for this asset from location inventory
        const inventoryItems = await db
            .select()
            .from(locationInventory)
            .where(eq(locationInventory.assetId, asset.id));

        // Sum up quantity across all locations (or specific location if we filter by location later)
        let totalStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

        // Fallback to asset quantity if locationInventory is not set up
        if (totalStock === 0) totalStock = (asset as any).capacity || 1; // Wait, capacity?

        if (totalStock === 0) continue; // Skip assets with no stock

        // 3. Get existing bookings for this asset on the target date
        const existingBookings = await db
            .select()
            .from(bookings)
            .where(and(
                eq(bookings.assetId, asset.id),
                or(
                    and(gte(bookings.startDate, startOfDay), lte(bookings.startDate, endOfDay)),
                    and(gte(bookings.endDate, startOfDay), lte(bookings.endDate, endOfDay)),
                    and(lte(bookings.startDate, startOfDay), gte(bookings.endDate, endOfDay))
                ),
                inArray(bookings.status, [BookingStatus.PENDING, BookingStatus.ACTIVE])
            ));

        // 4. Generate time slots (e.g., 8 AM to 8 PM)
        const slots = [];
        for (let hour = 8; hour < 20; hour++) {
            const slotTime = `${hour.toString().padStart(2, '0')}:00`;
            const slotDate = new Date(targetDate);
            slotDate.setHours(hour, 0, 0, 0);

            // Check how many bookings overlap with this hour
            const activeBookingsCount = existingBookings.filter(b => {
                const start = new Date(b.startDate);
                const end = new Date(b.endDate);
                return start <= slotDate && end > slotDate; // Exclusive end time check
            }).length;

            const availableQuantity = Math.max(0, totalStock - activeBookingsCount);

            slots.push({
                time: slotTime,
                available: availableQuantity,
                total: totalStock
            });
        }

        availabilityResults.push({
            asset,
            slots
        });
    }

    console.log(`Final results count: ${availabilityResults.length}`);
    if (availabilityResults.length > 0) {
        console.log(`Sample result slot 0: ${JSON.stringify(availabilityResults[0].slots[0])}`);
    }
    process.exit(0);
}

simulate().catch(console.error);
