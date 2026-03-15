import { DatabaseStorage } from "../server/storage";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verifyUser() {
    const storage = new DatabaseStorage();
    const [userRow] = await db.select().from(users).where(eq(users.email, 'base@example.com'));
    if (!userRow) {
        console.error("User not found");
        process.exit(1);
    }

    // Check if getUserSubscription exists on storage
    if (typeof (storage as any).getUserSubscription === 'function') {
        const sub = await (storage as any).getUserSubscription(userRow.id);
        console.log("Direct subscription:", sub);
    } else {
        console.log("storage.getUserSubscription does not exist?!");
    }

    const user = await storage.getUser(userRow.id);
    console.log("getUser return value:\n", JSON.stringify(user, null, 2));
    process.exit(0);
}

verifyUser().catch(console.error);
