
import { db } from "../server/db";
import { users, UserRole } from "../shared/schema";
import { eq } from "drizzle-orm";

async function makeAdmin(email: string) {
    console.log(`Looking for user with email: ${email}`);

    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || user.length === 0) {
        console.error(`User not found: ${email}`);
        process.exit(1);
    }

    console.log(`Found user: ${user[0].id}, Current Role: ${user[0].role}`);

    if (user[0].role === UserRole.ADMIN) {
        console.log("User is already an admin.");
        process.exit(0);
    }

    await db.update(users)
        .set({ role: UserRole.ADMIN, updatedAt: new Date() })
        .where(eq(users.id, user[0].id));

    console.log(`Successfully promoted ${email} to admin.`);
    process.exit(0);
}

const targetEmail = "ankit3765kumar@gmail.com";
makeAdmin(targetEmail).catch((error) => {
    console.error("Error updating user role:", error);
    process.exit(1);
});
