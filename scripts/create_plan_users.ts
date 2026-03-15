import { db } from "../server/db";
import { users, memberships, UserRole } from "../shared/schema";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";

async function createPlanUsers() {
    console.log("Creating test accounts with specific plans...");
    const passwordHash = await bcryptjs.hash("password123", 10);

    const testAccounts = [
        { email: "base@example.com", firstName: "Base", lastName: "User", plan: "base-explorer" },
        { email: "premium@example.com", firstName: "Premium", lastName: "User", plan: "premium-adventurer" },
        { email: "vip@example.com", firstName: "VIP", lastName: "User", plan: "vip-pathfinder" }
    ];

    for (const acc of testAccounts) {
        let userId;
        const existing = await db.select().from(users).where(eq(users.email, acc.email));

        if (existing.length === 0) {
            const [user] = await db.insert(users).values({
                email: acc.email,
                password: passwordHash, // backward compat
                metadata: { passwordHash: passwordHash },
                role: "member",
                firstName: acc.firstName,
                lastName: acc.lastName,
                waiverAccepted: true,
                adamsCredits: "1000.00"
            }).returning();
            userId = user.id;
            console.log(`Created user: ${acc.email}`);
        } else {
            userId = existing[0].id;
            await db.update(users).set({
                password: passwordHash,
                metadata: { passwordHash: passwordHash },
                adamsCredits: "1000.00"
            }).where(eq(users.id, userId));
            console.log(`Updated user: ${acc.email}`);
        }

        // Check membership
        const existingMem = await db.select().from(memberships).where(eq(memberships.userId, userId));
        if (existingMem.length === 0) {
            await db.insert(memberships).values({
                userId: userId,
                plan: acc.plan,
                status: 'active'
            });
            console.log(`Assigned plan ${acc.plan} to ${acc.email}`);
        } else {
            await db.update(memberships).set({ plan: acc.plan }).where(eq(memberships.userId, userId));
            console.log(`Updated plan to ${acc.plan} for ${acc.email}`);
        }
    }
    console.log("Done.");
    process.exit(0);
}

createPlanUsers().catch(console.error);
