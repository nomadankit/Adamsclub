
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "../server/storage";
import bcrypt from 'bcryptjs';

async function createTestUser() {
    const storage = new DatabaseStorage();
    const email = 'tester@adamsclub.com';
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    console.log(`Creating test user: ${email}`);

    // Check if exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
        console.log(`User ${email} exists (ID: ${existing[0].id}). Updating password...`);
        await storage.setPasswordHash(existing[0].id, hash);
        console.log("Password updated.");
    } else {
        console.log(`Creating user ${email}...`);
        const [user] = await db.insert(users).values({
            email,
            firstName: "Tester",
            lastName: "User",
            role: "member",
            metadata: { passwordHash: hash }
        }).returning();

        console.log(`User created: ${user.id}`);
    }
}

createTestUser().catch(console.error);
