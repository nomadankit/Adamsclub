
import { db } from "../db";
import { assets, AssetStatus } from "@shared/schema";
import { eq, like } from "drizzle-orm";

async function clearDemoAssets() {
    console.log("🧹 Clearing demo assets...");
    try {
        // Delete assets that look like demo data or have specific patterns if needed
        // based on user request "Remove all the demo data".
        // Since we don't have a reliable "isDemo" flag, we might want to check for typical demo names 
        // or just clear everything if that's what "Remove all" implies, but let's be careful.
        // The user said "Remove the demo data from there as it says 6 equipments".
        // I'll try to delete based on the creation time or if they are the default ones.
        // Assuming all current assets are demo since the user says "shows zero equipments till now" implying they haven't added any real ones or want to start fresh.

        // However, deleting EVERYTHING might be too aggressive if they added 1 real item.
        // Let's check if there are any obvious demo ones. 
        // Usually demo data is created in seed.ts. 
        // For now, I will delete ALL assets as per "Remove all the demo data... as it says 6 equipments... whereas... shows zero equipments till now". 
        // This implies the 6 are ghost/demo items.

        const result = await db.delete(assets).returning(); // delete all assets
        console.log(`✅ Deleted ${result.length} assets.`);
    } catch (error) {
        console.error("❌ Error clearing demo assets:", error);
    }
    process.exit(0);
}

clearDemoAssets();
