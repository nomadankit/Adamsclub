import { db } from "../server/db";
import { assets, bookings, locationInventory } from "../shared/schema";
import { eq, and, or, gte, lte, inArray } from "drizzle-orm";

async function queryAssets() {
    console.log("Assets count:", (await db.select().from(assets)).length);
    const all = await db.select().from(assets);
    console.log("All assets types:", all.map(a => `${a.name} (type: ${a.type}, category: ${a.category}, available: ${a.isAvailable})`));

    // Simulate /api/availability
    const targetDate = new Date("2026-02-22");

    // 1. Get all assets
    const filteredAssets = all.filter(a => a.isAvailable === true);
    console.log("Available assets count:", filteredAssets.length);

    const availabilityResults = [];

    for (const asset of filteredAssets) {
        const inventoryItems = await db
            .select()
            .from(locationInventory)
            .where(eq(locationInventory.assetId, asset.id));

        let totalStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

        let stockFrom = "inventory";
        if (totalStock === 0) {
            totalStock = asset.capacity || 1;
            stockFrom = "asset.capacity";
        }

        console.log(`Asset ${asset.name} stock: ${totalStock} (from ${stockFrom})`);

        if (totalStock === 0) {
            console.log(`Skipping ${asset.name} due to 0 stock`);
            continue;
        }

        availabilityResults.push({
            asset: { id: asset.id, name: asset.name },
            totalStock
        });
    }

    console.log("Final availability results count:", availabilityResults.length);
    process.exit(0);
}

queryAssets().catch(console.error);
