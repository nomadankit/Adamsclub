import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "../server/storage";
import bcrypt from 'bcryptjs';

async function seedTestAccounts() {
    const storage = new DatabaseStorage();
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    const testUsers = [
        { email: 'admin_test@adamsclub.com', firstName: 'Admin', lastName: 'Test', role: 'admin' },
        { email: 'staff_test@adamsclub.com', firstName: 'Staff', lastName: 'Test', role: 'staff' },
        { email: 'member_test@adamsclub.com', firstName: 'Member', lastName: 'Test', role: 'member' }
    ];

    for (const tUser of testUsers) {
        console.log(`Setting up test user: ${tUser.email} [${tUser.role}]`);

        // Check if exists
        const existing = await db.select().from(users).where(eq(users.email, tUser.email));

        if (existing.length > 0) {
            console.log(`User ${tUser.email} exists (ID: ${existing[0].id}). Updating role & password...`);
            // Update role and password
            await db.update(users)
                .set({ role: tUser.role, metadata: { passwordHash: hash } })
                .where(eq(users.id, existing[0].id));
            console.log(`✅ Updated ${tUser.email}`);
        } else {
            console.log(`Creating user ${tUser.email}...`);
            const [user] = await db.insert(users).values({
                email: tUser.email,
                firstName: tUser.firstName,
                lastName: tUser.lastName,
                role: tUser.role,
                adamsCredits: "100.00", // Give some credits for booking tests
                metadata: { passwordHash: hash }
            }).returning();
            console.log(`✅ Created ${tUser.email} (ID: ${user.id})`);
        }
    }
}

seedTestAccounts().catch(console.error);
