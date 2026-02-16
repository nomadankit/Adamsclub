
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";

async function createTestUsers() {
    const passwordHash = await bcryptjs.hash("password123", 10);

    const testUsers = [
        { email: "test_staff@example.com", role: "staff", firstName: "Test", lastName: "Staff" },
        { email: "test_member@example.com", role: "member", firstName: "Test", lastName: "Member" }
    ];

    for (const u of testUsers) {
        // Check if user exists
        const existing = await db.select().from(users).where(eq(users.email, u.email));

        if (existing.length === 0) {
            await db.insert(users).values({
                email: u.email,
                password: passwordHash,
                role: u.role,
                firstName: u.firstName,
                lastName: u.lastName,
                waiverAccepted: true,
            });
            console.log(`Created ${u.role} user: ${u.email}`);
        } else {
            // Ensure role is correct if existing
            await db.update(users).set({ role: u.role, password: passwordHash }).where(eq(users.email, u.email));
            console.log(`Updated ${u.role} user: ${u.email}`);
        }
    }
    process.exit(0);
}

createTestUsers().catch(console.error);
