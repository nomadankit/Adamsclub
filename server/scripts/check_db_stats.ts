
import { db } from "../db";
import { users, assets, bookings } from "@shared/schema";
import { sql, eq, and, count } from "drizzle-orm";

async function checkStats() {
    const userCount = await db.select({ count: count() }).from(users);
    const gearCount = await db.select({ count: count() }).from(assets).where(eq(assets.type, 'gear'));

    console.log("--- DB STATS ---");
    console.log(`Total Users: ${userCount[0].count}`);
    console.log(`Total Gear: ${gearCount[0].count}`);
    console.log("----------------");
}

checkStats().catch(console.error);
