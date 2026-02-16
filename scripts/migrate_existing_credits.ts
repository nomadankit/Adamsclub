
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handling __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual env loading
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["'](.*)[\"']$/, '$1');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
} else {
    console.log("No .env file found");
}

// Plan to credits mapping
const PLAN_CREDITS: Record<string, number> = {
    'base-explorer': 71,
    'premium-adventurer': 110,
    'vip-pathfinder': 200,
    // Legacy mappings
    'base': 71,
    'basic': 71,
    'premium': 110,
    'vip': 200,
};

function getCreditsForPlan(plan: string): number {
    const normalized = plan.toLowerCase().trim();
    return PLAN_CREDITS[normalized] || 0;
}

async function main() {
    console.log(`\n🚀 Starting credit migration for existing subscribers...\n`);

    try {
        const { db } = await import("../server/db");
        const { users, memberships, creditTransactions } = await import("@shared/schema");
        const { eq, and } = await import("drizzle-orm");

        // Get all users with active subscriptions
        const activeSubscriptions = await db
            .select({
                membership: memberships,
                user: users
            })
            .from(memberships)
            .leftJoin(users, eq(memberships.userId, users.id))
            .where(eq(memberships.status, 'active'));

        console.log(`📊 Found ${activeSubscriptions.length} active subscription(s)\n`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const { membership, user } of activeSubscriptions) {
            if (!user || !membership) {
                console.log(`⚠️  Skipping incomplete record`);
                skippedCount++;
                continue;
            }

            const planName = membership.plan;
            const creditsToGrant = getCreditsForPlan(planName);

            if (creditsToGrant === 0) {
                console.log(`⚠️  Unknown plan "${planName}" for user ${user.email}`);
                skippedCount++;
                continue;
            }

            // Check if user already received subscription credits (idempotency check)
            const existingCredits = await db
                .select()
                .from(creditTransactions)
                .where(and(
                    eq(creditTransactions.userId, user.id),
                    eq(creditTransactions.relatedEntityType, 'subscription_migration')
                ))
                .limit(1);

            if (existingCredits.length > 0) {
                console.log(`⏭️  Skipping ${user.email} - already migrated`);
                skippedCount++;
                continue;
            }

            try {
                // Add credits to user
                const currentBalance = parseFloat(user.adamsCredits || '0.00');
                const newBalance = currentBalance + creditsToGrant;

                await db.update(users)
                    .set({
                        adamsCredits: newBalance.toFixed(2),
                        updatedAt: new Date()
                    })
                    .where(eq(users.id, user.id));

                // Create transaction record for audit trail
                await db.insert(creditTransactions).values({
                    userId: user.id,
                    type: 'purchase',
                    amount: creditsToGrant.toFixed(2),
                    balanceAfter: newBalance.toFixed(2),
                    description: `Subscription credit migration: ${creditsToGrant} Adventure Credits for ${planName} plan`,
                    relatedEntityType: 'subscription_migration',
                    relatedEntityId: membership.id
                });

                console.log(`✅ ${user.email}: +${creditsToGrant} credits (${planName}) | New balance: ${newBalance.toFixed(2)}`);
                migratedCount++;

            } catch (err: any) {
                console.error(`❌ Error migrating ${user.email}: ${err.message}`);
                errorCount++;
            }
        }

        console.log(`\n========================================`);
        console.log(`📊 Migration Summary`);
        console.log(`========================================`);
        console.log(`   ✅ Migrated: ${migratedCount} user(s)`);
        console.log(`   ⏭️  Skipped: ${skippedCount} user(s)`);
        console.log(`   ❌ Errors: ${errorCount} user(s)`);
        console.log(`========================================\n`);

    } catch (error) {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }

    process.exit(0);
}

main().catch(console.error);
