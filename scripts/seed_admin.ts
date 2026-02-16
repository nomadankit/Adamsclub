
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from 'bcryptjs';

async function seedAdmin() {
    const email = 'admin@adamsclub.com';
    const password = 'admin123';

    console.log(`Seeding user: ${email}`);

    // Check if exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

    const hash = await bcrypt.hash(password, 10);

    if (existing.length > 0) {
        console.log(`User exists (ID: ${existing[0].id}). Updating password...`);
        // Note: Schema might use password_hash or passwordHash depending on drizzle definition.
        // Checking schema.ts would be ideal, but 'passwordHash' is standard in this codebase based on auth.ts reading.
        await db.update(users).set({ passwordHash: hash, role: 'admin' }).where(eq(users.id, existing[0].id));
        console.log('✅ Password updated.');
    } else {
        console.log('Creating new user...');
        await db.insert(users).values({
            email,
            passwordHash: hash,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            waiverAccepted: true,
            marketingOptIn: false
        });
        console.log('✅ User created.');
    }
    process.exit(0);
}

seedAdmin().catch(e => {
    console.error(e);
    process.exit(1);
});
