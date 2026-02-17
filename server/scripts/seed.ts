
import { db } from "../db";
import { 
  users, 
  assets, 
  bookings, 
  memberships, 
  tiers, 
  perks, 
  tierPerks, 
  locations,
  AssetStatus,
  BookingStatus,
  UserRole,
  TierType
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function seed() {
  console.log("🌱 Starting seeding...");

  // 1. Locations
  console.log("📍 Seeding locations...");
  const mainLocation = {
    id: "loc-main",
    code: "MAIN",
    name: "Adam's Club Main Hub",
    description: "Primary equipment and member center",
    isActive: true
  };
  await db.insert(locations).values(mainLocation).onConflictDoUpdate({
    target: locations.code,
    set: { name: mainLocation.name, description: mainLocation.description }
  });

  // 2. Users
  console.log("👤 Seeding users...");
  const passwordHash = await bcrypt.hash("Password123!", 10);
  
  const demoUsers = [
    { id: "u-admin", email: "admin@adamsclub.test", firstName: "Admin", lastName: "User", role: UserRole.ADMIN },
    { id: "u-staff1", email: "staff1@adamsclub.test", firstName: "Staff", lastName: "One", role: UserRole.STAFF },
    { id: "u-staff2", email: "staff2@adamsclub.test", firstName: "Staff", lastName: "Two", role: UserRole.STAFF },
    { id: "u-member1", email: "member1@adamsclub.test", firstName: "Member", lastName: "One", role: UserRole.MEMBER, adamsCredits: "100.00" },
    { id: "u-member2", email: "member2@adamsclub.test", firstName: "Member", lastName: "Two", role: UserRole.MEMBER, adamsCredits: "100.00" },
    { id: "u-member3", email: "member3@adamsclub.test", firstName: "Member", lastName: "Three", role: UserRole.MEMBER, adamsCredits: "100.00" },
  ];

  for (const u of demoUsers) {
    await db.insert(users).values({
      ...u,
      password: passwordHash,
      metadata: { passwordHash }
    }).onConflictDoUpdate({
      target: users.email,
      set: { role: u.role, firstName: u.firstName, lastName: u.lastName }
    });
  }

  // 3. Tiers & Perks (Basic setup for credit/booking tests)
  console.log("👑 Seeding tiers...");
  const baseTier = { id: "t-base", name: "BASE", type: TierType.SUBSCRIPTION, price: 29.99, creditsPerMonth: 50 };
  await db.insert(tiers).values(baseTier).onConflictDoUpdate({
    target: tiers.name,
    set: { price: baseTier.price }
  });

  // 4. Assets (Equipment)
  console.log("🚲 Seeding assets...");
  const assetData = [
    // Bikes
    ...Array.from({ length: 5 }).map((_, i) => ({
      id: `asset-bike-${i+1}`,
      name: `Mountain Bike ${i+1}`,
      type: "gear",
      category: "bike",
      barcode: `AC-BIKE-00${i+1}`,
      status: i === 4 ? AssetStatus.MAINTENANCE : AssetStatus.AVAILABLE,
      isAvailable: i !== 4,
      dailyRate: 10,
      currentLocationId: "loc-main"
    })),
    // Kayaks
    ...Array.from({ length: 3 }).map((_, i) => ({
      id: `asset-kayak-${i+1}`,
      name: `Tandem Kayak ${i+1}`,
      type: "gear",
      category: "kayak",
      barcode: `AC-KAYAK-00${i+1}`,
      status: AssetStatus.AVAILABLE,
      isAvailable: true,
      dailyRate: 15,
      currentLocationId: "loc-main"
    })),
    // Camping
    ...Array.from({ length: 4 }).map((_, i) => ({
      id: `asset-camp-${i+1}`,
      name: `Camping Kit ${i+1}`,
      type: "gear",
      category: "camping",
      barcode: `AC-CAMP-00${i+1}`,
      status: AssetStatus.AVAILABLE,
      isAvailable: true,
      dailyRate: 20,
      currentLocationId: "loc-main"
    })),
  ];

  for (const a of assetData) {
    await db.insert(assets).values(a).onConflictDoUpdate({
      target: assets.barcode,
      set: { status: a.status, isAvailable: a.isAvailable }
    });
  }

  // 5. Bookings
  console.log("📅 Seeding bookings...");
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  const demoBookings = [
    {
      id: "b-upcoming",
      userId: "u-member1",
      assetId: "asset-bike-1",
      status: BookingStatus.PENDING,
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
      qrToken: "ACB-UPCOMING-BIKE",
      qrCode: "ACB-UPCOMING-BIKE"
    },
    {
      id: "b-active",
      userId: "u-member1",
      assetId: "asset-kayak-1",
      status: BookingStatus.ACTIVE,
      startDate: yesterday,
      endDate: tomorrow,
      qrToken: "ACB-ACTIVE-KAYAK",
      qrCode: "ACB-ACTIVE-KAYAK",
      checkedOutAt: yesterday,
      checkedOutBy: "u-staff1"
    },
    {
      id: "b-completed",
      userId: "u-member1",
      assetId: "asset-camp-1",
      status: BookingStatus.COMPLETED,
      startDate: yesterday,
      endDate: now,
      qrToken: "ACB-COMPLETED-CAMP",
      qrCode: "ACB-COMPLETED-CAMP",
      checkedOutAt: yesterday,
      checkedInAt: now
    },
    {
      id: "b-cancelled",
      userId: "u-member2",
      assetId: "asset-bike-2",
      status: BookingStatus.CANCELLED,
      startDate: now,
      endDate: tomorrow,
      qrToken: "ACB-CANCELLED-BIKE",
      qrCode: "ACB-CANCELLED-BIKE"
    }
  ];

  for (const b of demoBookings) {
    await db.insert(bookings).values(b).onConflictDoNothing();
  }

  // Set asset status for active booking
  await db.update(assets).set({ status: 'active', isAvailable: false }).where(eq(assets.id, "asset-kayak-1"));

  console.log("✅ Seeding completed!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
