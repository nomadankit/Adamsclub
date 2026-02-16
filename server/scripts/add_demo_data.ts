
import { db } from "../db";
import { users, assets, memberships, AssetType } from "@shared/schema";
import { sql } from "drizzle-orm";

async function addDemoData() {
    console.log("Adding demo data...");

    // 1. Add 5 Demo Members
    const demoUsers = [];
    for (let i = 1; i <= 5; i++) {
        demoUsers.push({
            email: `demo_user_${i}@test.com`,
            firstName: `Demo${i}`,
            lastName: `User`,
            role: 'member',
            createdAt: new Date(),
        });
    }

    // Insert users and capture IDs if possible, or just insert
    // SQLite doesn't return * easily in all drivers with Drizzle batch, but better-sqlite3 does usually.
    // We'll iterate to keep it simple and get IDs.

    const createdUserIds = [];
    for (const u of demoUsers) {
        const result = await db.insert(users).values(u).returning({ id: users.id });
        createdUserIds.push(result[0].id);

        // Add active membership
        await db.insert(memberships).values({
            userId: result[0].id,
            plan: 'premium',
            status: 'active'
        });
    }
    console.log(`Added ${createdUserIds.length} demo users.`);

    // 2. Add 3 Demo Gear Items
    const demoAssets = [];
    for (let i = 1; i <= 3; i++) {
        demoAssets.push({
            name: `Demo Surfboard ${i}`,
            type: AssetType.GEAR,
            description: 'Demo item for testing',
            isAvailable: true,
            dailyRate: 15.0,
        });
    }

    for (const a of demoAssets) {
        await db.insert(assets).values(a);
    }
    console.log(`Added ${demoAssets.length} demo gear items.`);

    console.log("Demo data addition complete.");
}

addDemoData().catch(console.error);
