
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Development database connection
const devDatabaseUrl = process.env.DATABASE_URL;
if (!devDatabaseUrl) {
  throw new Error('DATABASE_URL must be set for development database');
}

// Production database connection
const prodDatabaseUrl = process.env.PROD_DATABASE_URL;
if (!prodDatabaseUrl) {
  throw new Error('PROD_DATABASE_URL must be set for production database');
}

const devPool = new Pool({ connectionString: devDatabaseUrl });
const devDb = drizzle({ client: devPool, schema });

const prodPool = new Pool({ connectionString: prodDatabaseUrl });
const prodDb = drizzle({ client: prodPool, schema });

async function migrateUsers() {
  console.log('🔄 Starting user migration from development to production...');

  try {
    // Fetch all users from development database
    console.log('  → Fetching users from development database...');
    const users = await devDb.select().from(schema.users);
    console.log(`  → Found ${users.length} users to migrate`);

    // Insert users into production database
    for (const user of users) {
      try {
        await prodDb.insert(schema.users).values(user).onConflictDoNothing();
      } catch (error) {
        console.warn(`  ⚠️  Skipped user ${user.email} (may already exist)`);
      }
    }
    console.log('  ✅ Users migrated successfully');

    // Migrate memberships
    console.log('  → Fetching memberships from development database...');
    const memberships = await devDb.select().from(schema.memberships);
    console.log(`  → Found ${memberships.length} memberships to migrate`);

    for (const membership of memberships) {
      try {
        await prodDb.insert(schema.memberships).values(membership).onConflictDoNothing();
      } catch (error) {
        console.warn(`  ⚠️  Skipped membership for user ${membership.userId}`);
      }
    }
    console.log('  ✅ Memberships migrated successfully');

    // Migrate user roles
    console.log('  → Fetching user roles from development database...');
    const userRoles = await devDb.select().from(schema.userRoles);
    console.log(`  → Found ${userRoles.length} user roles to migrate`);

    for (const userRole of userRoles) {
      try {
        await prodDb.insert(schema.userRoles).values(userRole).onConflictDoNothing();
      } catch (error) {
        console.warn(`  ⚠️  Skipped user role for user ${userRole.userId}`);
      }
    }
    console.log('  ✅ User roles migrated successfully');

    // Migrate user locations
    console.log('  → Fetching user locations from development database...');
    const userLocations = await devDb.select().from(schema.userLocations);
    console.log(`  → Found ${userLocations.length} user locations to migrate`);

    for (const userLocation of userLocations) {
      try {
        await prodDb.insert(schema.userLocations).values(userLocation).onConflictDoNothing();
      } catch (error) {
        console.warn(`  ⚠️  Skipped user location for user ${userLocation.userId}`);
      }
    }
    console.log('  ✅ User locations migrated successfully');

    // Migrate credit transactions
    console.log('  → Fetching credit transactions from development database...');
    const creditTransactions = await devDb.select().from(schema.creditTransactions);
    console.log(`  → Found ${creditTransactions.length} credit transactions to migrate`);

    for (const transaction of creditTransactions) {
      try {
        await prodDb.insert(schema.creditTransactions).values(transaction).onConflictDoNothing();
      } catch (error) {
        console.warn(`  ⚠️  Skipped credit transaction ${transaction.id}`);
      }
    }
    console.log('  ✅ Credit transactions migrated successfully');

    // Migrate user waivers
    console.log('  → Fetching user waivers from development database...');
    const userWaivers = await devDb.select().from(schema.userWaivers);
    console.log(`  → Found ${userWaivers.length} user waivers to migrate`);

    for (const waiver of userWaivers) {
      try {
        await prodDb.insert(schema.userWaivers).values(waiver).onConflictDoNothing();
      } catch (error) {
        console.warn(`  ⚠️  Skipped user waiver ${waiver.id}`);
      }
    }
    console.log('  ✅ User waivers migrated successfully');

    console.log('✅ User migration completed successfully!');
    console.log(`Total users migrated: ${users.length}`);
    
  } catch (error) {
    console.error('❌ User migration failed:', error);
    throw error;
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

migrateUsers()
  .then(() => {
    console.log('Migration process finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process encountered an error:', error);
    process.exit(1);
  });
