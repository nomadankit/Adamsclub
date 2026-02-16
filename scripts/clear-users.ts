
import { db } from '../server/db.js';
import { users, creditTransactions, memberships, bookings, userWaivers, auditLog, userRoles, userLocations } from '../shared/schema.js';

async function clearAllUsers() {
  try {
    console.log('🗑️  Clearing all users and related data from database...');
    
    // Delete in the correct order to handle foreign key constraints
    console.log('  → Deleting credit transactions...');
    await db.delete(creditTransactions);
    
    console.log('  → Deleting user waivers...');
    await db.delete(userWaivers);
    
    console.log('  → Deleting bookings...');
    await db.delete(bookings);
    
    console.log('  → Deleting memberships...');
    await db.delete(memberships);
    
    console.log('  → Deleting user roles...');
    await db.delete(userRoles);
    
    console.log('  → Deleting user locations...');
    await db.delete(userLocations);
    
    console.log('  → Deleting audit logs...');
    await db.delete(auditLog);
    
    console.log('  → Deleting users...');
    await db.delete(users);
    
    console.log('✅ All users and related data have been deleted');
    console.log('You can now sign up with a fresh account');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

clearAllUsers();
