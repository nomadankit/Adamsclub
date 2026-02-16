
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedTestUsers() {
    console.log('Seeding test users...');

    // Hash password
    const hash = await bcrypt.hash('password123', 10);

    const testUsers = [
        {
            email: 'user1@test.com',
            role: 'member',
            firstName: 'Test',
            lastName: 'User 1'
        },
        {
            email: 'user2@test.com',
            role: 'member',
            firstName: 'Test',
            lastName: 'User 2'
        }
    ];

    for (const u of testUsers) {
        console.log(`Seeding user: ${u.email}`);

        const existing = await db.select().from(users).where(eq(users.email, u.email));

        if (existing.length > 0) {
            console.log(`User exists (ID: ${existing[0].id}). Updating password...`);
            await db.update(users).set({
                password: hash,
                role: u.role,
                firstName: u.firstName,
                lastName: u.lastName,
                waiverAccepted: true
            }).where(eq(users.id, existing[0].id));
            console.log('✅ Updated.');
        } else {
            console.log('Creating new user...');
            await db.insert(users).values({
                email: u.email,
                password: hash,
                firstName: u.firstName,
                lastName: u.lastName,
                role: u.role,
                waiverAccepted: true,
                adamsCredits: '0.00'
            });
            console.log('✅ Created.');
        }
    }

    console.log('Done seeding test users.');
    process.exit(0);
}

seedTestUsers().catch((err) => {
    console.error('Failed to seed users:', err);
    process.exit(1);
});
