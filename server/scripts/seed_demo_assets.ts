
import { db } from "../db";
import { assets, AssetType, AssetStatus, locations, locationInventory } from "../../shared/schema";

async function addDemoData() {
    console.log("🌱 Adding demo gear and consumables...");

    // Get the main location
    const locationList = await db.select().from(locations).limit(1);
    const locationId = locationList.length > 0 ? locationList[0].id : null;

    if (!locationId) {
        console.error("❌ No locations found. Please run the main seed script first.");
        process.exit(1);
    }

    const demoAssets = [
        // Gear
        {
            name: "Premium Mountain Bike",
            type: AssetType.GEAR,
            category: "Bikes",
            brand: "Trek",
            model: "Fuel EX",
            description: "Full suspension mountain bike for trail riding.",
            barcode: "GEAR-BIKE-001",
            status: AssetStatus.AVAILABLE,
            isAvailable: true,
            dailyRate: 45.0,
            creditPrice: 50,
            currentLocationId: locationId,
        },
        {
            name: "Inflatable Paddleboard",
            type: AssetType.GEAR,
            category: "Water Sports",
            brand: "iROCKER",
            model: "All-Around 11'",
            description: "Stable and versatile inflatable SUP.",
            barcode: "GEAR-SUP-001",
            status: AssetStatus.AVAILABLE,
            isAvailable: true,
            dailyRate: 35.0,
            creditPrice: 40,
            currentLocationId: locationId,
        },
        {
            name: "Camping Tent (4-Person)",
            type: AssetType.GEAR,
            category: "Camping",
            brand: "REI Co-op",
            model: "Kingdom 4",
            description: "Spacious tent for family camping trips.",
            barcode: "GEAR-TENT-001",
            status: AssetStatus.AVAILABLE,
            isAvailable: true,
            dailyRate: 25.0,
            creditPrice: 30,
            currentLocationId: locationId,
        },
        // Consumables
        {
            name: "Energy Gel (Berry Blast)",
            type: AssetType.CONSUMABLE,
            category: "Nutrition",
            brand: "GU Energy",
            description: "Quick energy boost for long rides or runs.",
            barcode: "CONS-GEL-001",
            status: AssetStatus.AVAILABLE,
            isAvailable: true,
            dailyRate: 0,
            creditPrice: 5,
            currentLocationId: locationId,
        },
        {
            name: "Water Purification Tablets",
            type: AssetType.CONSUMABLE,
            category: "Hiking",
            brand: "Aquatabs",
            description: "Pack of 50 tablets for safe drinking water.",
            barcode: "CONS-TABS-001",
            status: AssetStatus.AVAILABLE,
            isAvailable: true,
            dailyRate: 0,
            creditPrice: 15,
            currentLocationId: locationId,
        },
        {
            name: "Fire Starter Kit",
            type: AssetType.CONSUMABLE,
            category: "Camping",
            brand: "Light My Fire",
            description: "Waterproof fire starting kit.",
            barcode: "CONS-FIRE-001",
            status: AssetStatus.AVAILABLE,
            isAvailable: true,
            dailyRate: 0,
            creditPrice: 10,
            currentLocationId: locationId,
        }
    ];

    for (const asset of demoAssets) {
        try {
            const [insertedAsset] = await db.insert(assets).values(asset).onConflictDoUpdate({
                target: assets.barcode,
                set: asset
            }).returning();
            
            console.log(`✅ Added/Updated: ${asset.name}`);

            // Ensure location inventory exists
            await db.insert(locationInventory).values({
                locationId: locationId,
                assetId: insertedAsset.id,
                quantity: asset.type === AssetType.CONSUMABLE ? 50 : 5,
                creditPrice: asset.creditPrice || 0,
            }).onConflictDoUpdate({
                target: [locationInventory.locationId, locationInventory.assetId],
                set: { quantity: asset.type === AssetType.CONSUMABLE ? 50 : 5 }
            });
            console.log(`📦 Inventory updated for: ${asset.name}`);
        } catch (error) {
            console.error(`❌ Error adding ${asset.name}:`, error);
        }
    }

    console.log("✨ Demo gear and consumables addition complete.");
}

addDemoData().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
