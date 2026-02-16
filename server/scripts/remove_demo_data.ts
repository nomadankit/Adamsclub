
import { db } from "../db";
import { users, assets } from "@shared/schema";
import { sql, like, inArray } from "drizzle-orm";

async function removeDemoData() {
    console.log("Removing demo data...");

    // Delete users with demo email pattern
    const deletedUsers = await db.delete(users).where(like(users.email, 'demo_user_%@test.com')).returning({ id: users.id });
    console.log(`Deleted ${deletedUsers.length} demo users.`);

    // Delete assets with demo name pattern
    const deletedAssets = await db.delete(assets).where(like(assets.name, 'Demo Surfboard %')).returning({ id: assets.id });
    console.log(`Deleted ${deletedAssets.length} demo assets.`);

    console.log("Demo data removal complete.");
}

removeDemoData().catch(console.error);
