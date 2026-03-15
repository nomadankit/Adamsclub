import { db } from '../server/db';
import { users, assets, locationInventory, locations, bookings, BookingStatus } from '@shared/schema';
import { storage } from '../server/storage';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
    console.log('🌱 Seeding demo accounts for Token verification...');

    // 1. Create Demo User
    let userStr = await storage.getAllUsers();
    let user = userStr.find(u => u.email === 'demo_user@test.com');
    if (!user) {
        let [newUser] = await db.insert(users).values({
            email: 'demo_user@test.com',
            firstName: 'Demo',
            lastName: 'User',
            password: 'password',
            role: 'member',
            adamsCredits: '100.00',
            metadata: { tokenBalance: '0' }
        }).returning();
        user = newUser;
    }
    const hashedUserStr = await bcrypt.hash('password', 10);
    await storage.setPasswordHash(user!.id, hashedUserStr);

    // 2. Create Demo Staff
    let staff = userStr.find(u => u.email === 'demo_staff@test.com');
    if (!staff) {
        let [newStaff] = await db.insert(users).values({
            email: 'demo_staff@test.com',
            firstName: 'Demo',
            lastName: 'Staff',
            password: 'password',
            role: 'staff',
            adamsCredits: '0.00'
        }).returning();
        staff = newStaff;
    }
    const hashedStaffStr = await bcrypt.hash('password', 10);
    await storage.setPasswordHash(staff!.id, hashedStaffStr);

    // 3. Create Asset with Excellent Token Reward
    const [asset] = await storage.getAssets({ type: 'gear' });
    let targetAsset = asset;

    if (!targetAsset) {
        targetAsset = await storage.createAsset({
            name: 'Token Gear',
            description: 'Gear that gives tokens',
            type: 'gear',
            category: 'camping',
            excellentTokenReward: 50,
            isAvailable: true,
            status: 'active'
        });
    } else {
        await db.update(assets).set({ excellentTokenReward: 50 }).where(eq(assets.id, targetAsset.id));
    }

    // 4. Create Booking
    const now = new Date();
    const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    const booking = await storage.createBooking({
        userId: user!.id,
        assetId: targetAsset.id,
        startDate: start,
        endDate: end,
        status: BookingStatus.ACTIVE,
        paidWithCredits: true
    });

    console.log(`✅ Seeded Data.`);
    console.log(`   User: demo_user@test.com / password`);
    console.log(`   Staff: demo_staff@test.com / password`);
    console.log(`   Booking Code: ${booking.qrCode}`);

    process.exit(0);
}

seed().catch(console.error);
