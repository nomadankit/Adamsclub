import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess", { mode: "json" }).notNull(),
    expire: integer("expire", { mode: "timestamp" }).notNull(), // SQLite stores dates as integers or text
  }
);

// User roles enum
export const UserRole = {
  MEMBER: 'member',
  STAFF: 'staff',
  ADMIN: 'admin'
} as const;

// Membership plans enum
export const MembershipPlan = {
  BASE: 'base',
  PREMIUM: 'premium',
  VIP: 'vip',
  EMPLOYEE: 'employee'
} as const;

// Tier types enum
export const TierType = {
  SUBSCRIPTION: 'subscription',
  LOYALTY: 'loyalty'
} as const;

// Perk types enum
export const PerkType = {
  SUBSCRIPTION: 'subscription',
  LOYALTY: 'loyalty'
} as const;

// Booking status enum
export const BookingStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

// Asset types enum
export const AssetType = {
  GEAR: 'gear',
  EXPERIENCE: 'experience',
  CONSUMABLE: 'consumable'
} as const;

// Credit transaction types enum
export const CreditTransactionType = {
  PURCHASE: 'purchase',
  SPEND: 'spend',
  REFUND: 'refund',
  BONUS: 'bonus',
  ADJUSTMENT: 'adjustment'
} as const;

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  googleId: text("google_id").unique(),
  role: text("role").default(UserRole.MEMBER),
  phone: text("phone"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  dateOfBirth: text("date_of_birth"), // Store as ISO date string
  waiverAccepted: integer("waiver_accepted", { mode: "boolean" }).default(false),
  waiverAcceptedAt: integer("waiver_accepted_at", { mode: "timestamp" }),
  marketingOptIn: integer("marketing_opt_in", { mode: "boolean" }).default(false),
  adamsCredits: text("adams_credits").default('0.00'), // Keep as text for precision
  bio: text("bio"),
  metadata: text("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Memberships table
export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text("plan").notNull(),
  status: text("status").default('active'),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  currentPeriodStart: integer("current_period_start", { mode: "timestamp" }),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const tiers = sqliteTable("tiers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  type: text("type").default(TierType.SUBSCRIPTION),
  price: real("price"),
  creditsPerMonth: integer("credits_per_month").default(0),
  monthsRequired: integer("months_required"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const perks = sqliteTable("perks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  type: text("type").default(PerkType.SUBSCRIPTION),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const tierPerks = sqliteTable("tier_perks", {
  tierId: text("tier_id").notNull().references(() => tiers.id, { onDelete: 'cascade' }),
  perkId: text("perk_id").notNull().references(() => perks.id, { onDelete: 'cascade' }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}); // Composite PK not directly supported in same syntax, standard practice relies on uniqueness logic or separate handling

// Asset status enum for scan actions
export const AssetStatus = {
  AVAILABLE: 'available',
  CHECKED_OUT: 'active',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
} as const;

// Assets table (gear and experiences)
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  category: text("category"),
  brand: text("brand"),
  model: text("model"),
  barcode: text("barcode").unique(),
  serialNumber: text("serial_number"),
  condition: text("condition").default('excellent'),
  status: text("status").default(AssetStatus.AVAILABLE),
  dailyRate: real("daily_rate"),
  depositAmount: real("deposit_amount"),
  creditPrice: real("credit_price"),
  isAddonOnly: integer("is_addon_only", { mode: "boolean" }).default(false),
  capacity: integer("capacity").default(1),
  isAvailable: integer("is_available", { mode: "boolean" }).default(true),
  maintenanceMode: integer("maintenance_mode", { mode: "boolean" }).default(false),
  currentLocationId: text("current_location_id").references(() => locations.id),
  location: text("location"),
  tags: text("tags", { mode: "json" }), // Store array as JSON
  lastScannedAt: integer("last_scanned_at", { mode: "timestamp" }),
  lastScannedBy: text("last_scanned_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const assetImages = sqliteTable("asset_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  status: text("status").default(BookingStatus.PENDING),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  totalAmount: real("total_amount"),
  depositAmount: real("deposit_amount"),
  depositCaptured: integer("deposit_captured", { mode: "boolean" }).default(false),
  creditsUsed: text("credits_used").default('0.00'),
  paidWithCredits: integer("paid_with_credits", { mode: "boolean" }).default(false),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeDepositIntentId: text("stripe_deposit_intent_id"),
  qrCode: text("qr_code").unique(),
  qrToken: text("qr_token").unique(),
  checkedOutAt: integer("checked_out_at", { mode: "timestamp" }),
  checkedOutBy: text("checked_out_by").references(() => users.id),
  checkedInAt: integer("checked_in_at", { mode: "timestamp" }),
  checkedInBy: text("checked_in_by").references(() => users.id),
  damageNotes: text("damage_notes"),
  damagePhotos: text("damage_photos", { mode: "json" }), // Store array as JSON
  cancellationReason: text("cancellation_reason"),
  bufferEnd: integer("buffer_end_datetime", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const creditTransactions = sqliteTable("credit_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: text("amount").notNull(), // Decimal as text in SQLite commonly
  balanceAfter: text("balance_after").notNull(),
  description: text("description").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  processedBy: text("processed_by").references(() => users.id),
  metadata: text("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const waivers = sqliteTable("waivers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  version: text("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const userWaivers = sqliteTable("user_waivers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  waiverId: text("waiver_id").notNull().references(() => waivers.id),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  isGlobal: integer("is_global", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const rolePermissions = sqliteTable("role_permissions", {
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const userRoles = sqliteTable("user_roles", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const userLocations = sqliteTable("user_locations", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  oldValues: text("old_values", { mode: "json" }),
  newValues: text("new_values", { mode: "json" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// User tier and benefit tracking
export const userTierBenefits = sqliteTable("user_tier_benefits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  currentTierId: text("current_tier_id").notNull().references(() => tiers.id),
  tierType: text("tier_type").default(TierType.SUBSCRIPTION),
  perkId: text("perk_id").references(() => perks.id),
  monthlyAllowance: integer("monthly_allowance").default(0), // 0 = unlimited, -1 = active/status benefit
  usedThisMonth: integer("used_this_month").default(0),
  lastResetDate: integer("last_reset_date", { mode: "timestamp" }).default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Loyalty tier achievements
export const loyaltyTierAchievements = sqliteTable("loyalty_tier_achievements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tierId: text("tier_id").notNull().references(() => tiers.id),
  monthsOfSubscription: integer("months_of_subscription").notNull(),
  achievedAt: integer("achieved_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Location inventory table
export const locationInventory = sqliteTable("location_inventory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(0),
  creditPrice: real("credit_price").default(0.00),
  lastUpdatedBy: text("last_updated_by").references(() => users.id),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Equipment checkouts
export const equipmentCheckouts = sqliteTable("equipment_checkouts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text("member_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  creditsCost: real("credits_cost").notNull(),
  issuedBy: text("issued_by").notNull().references(() => users.id),
  issuedAt: integer("issued_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  returnDeadline: integer("return_deadline", { mode: "timestamp" }),
  returnedAt: integer("returned_at", { mode: "timestamp" }),
  returnedBy: text("returned_by").references(() => users.id),
  condition: text("condition").default('good'),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Asset scan history
export const assetScanHistory = sqliteTable("asset_scan_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  scannedBy: text("scanned_by").notNull().references(() => users.id),
  locationId: text("location_id").references(() => locations.id),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  bookingId: text("booking_id").references(() => bookings.id),
  notes: text("notes"),
  damageReported: integer("damage_reported", { mode: "boolean" }).default(false),
  scannedAt: integer("scanned_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Admin settings
export const adminSettings = sqliteTable("admin_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type AdminSetting = typeof adminSettings.$inferSelect;

// Password reset tokens table
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  tempPassword: text("temp_password").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Waitlist leads table
export const waitlistLeads = sqliteTable("waitlist_leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  location: text("location"),
  interests: text("interests", { mode: "json" }), // JSON array
  state: text("state").notNull(),
  optInMarketing: integer("opt_in_marketing", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Email tracking table
export const waitlistEmails = sqliteTable("waitlist_emails", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text("lead_id").notNull().references(() => waitlistLeads.id, { onDelete: 'cascade' }),
  emailType: text("email_type").notNull(), // main or followup
  followupNumber: integer("followup_number").default(0), // 0 for main, 1-8 for followups
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").default('draft'),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  sentBy: text("sent_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type WaitlistLead = typeof waitlistLeads.$inferSelect;
export type WaitlistEmail = typeof waitlistEmails.$inferSelect;
export const insertWaitlistLeadSchema = createInsertSchema(waitlistLeads).omit({ id: true, createdAt: true });
export type InsertWaitlistLead = z.infer<typeof insertWaitlistLeadSchema>;
export const insertWaitlistEmailSchema = createInsertSchema(waitlistEmails).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWaitlistEmail = z.infer<typeof insertWaitlistEmailSchema>;

// Legacy waitlist table
export const waitlist = sqliteTable("waitlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  email: text("email").notNull().unique(),
  state: text("state").notNull(),
  optInMarketing: integer("opt_in_marketing", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type Waitlist = typeof waitlist.$inferSelect;
export const insertWaitlistSchema = createInsertSchema(waitlist).omit({ id: true, createdAt: true });
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

// User Role History
export const userRoleHistory = sqliteTable("user_role_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  previousRole: text("previous_role"),
  newRole: text("new_role").notNull(),
  changedBy: text("changed_by").references(() => users.id),
  reason: text("reason"),
  appliedAt: integer("applied_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export type UserRoleHistory = typeof userRoleHistory.$inferSelect;
export const insertUserRoleHistorySchema = createInsertSchema(userRoleHistory).omit({ id: true, createdAt: true });
export type InsertUserRoleHistory = z.infer<typeof insertUserRoleHistorySchema>;

// Type exports for storage operations
export type User = typeof users.$inferSelect;
export type UpsertUser = Partial<User>;
export type Membership = typeof memberships.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type AssetImage = typeof assetImages.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Waiver = typeof waivers.$inferSelect;
export type UserWaiver = typeof userWaivers.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertMembershipSchema = createInsertSchema(memberships).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({ id: true, createdAt: true });
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;

// Booking schemas for validation
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type SelectBooking = typeof bookings.$inferSelect;

// Inventory schemas
export const insertLocationInventorySchema = createInsertSchema(locationInventory).omit({ id: true, updatedAt: true });
export type InsertLocationInventory = z.infer<typeof insertLocationInventorySchema>;
export type LocationInventory = typeof locationInventory.$inferSelect;

// Equipment checkout schemas
export const insertEquipmentCheckoutSchema = createInsertSchema(equipmentCheckouts).omit({ id: true, createdAt: true });
export type InsertEquipmentCheckout = z.infer<typeof insertEquipmentCheckoutSchema>;
export type EquipmentCheckout = typeof equipmentCheckouts.$inferSelect;

// Asset scan history schemas
export const insertAssetScanHistorySchema = createInsertSchema(assetScanHistory).omit({ id: true, scannedAt: true });
export type InsertAssetScanHistory = z.infer<typeof insertAssetScanHistorySchema>;
export type AssetScanHistory = typeof assetScanHistory.$inferSelect;