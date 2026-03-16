import { sql } from 'drizzle-orm';
import {
  text,
  integer,
  boolean,
  timestamp,
  real,
  pgTable,
  serial,
  json,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

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
export const users = pgTable("users", {
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
  dateOfBirth: text("date_of_birth"),
  waiverAccepted: boolean("waiver_accepted").default(false),
  waiverAcceptedAt: timestamp("waiver_accepted_at"),
  marketingOptIn: boolean("marketing_opt_in").default(false),
  adamsCredits: text("adams_credits").default('0.00'),
  bio: text("bio"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Memberships table
export const memberships = pgTable("memberships", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text("plan").notNull(),
  status: text("status").default('active'),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tiers = pgTable("tiers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  type: text("type").default(TierType.SUBSCRIPTION),
  price: real("price"),
  creditsPerMonth: integer("credits_per_month").default(0),
  monthsRequired: integer("months_required"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const perks = pgTable("perks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  type: text("type").default(PerkType.SUBSCRIPTION),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tierPerks = pgTable("tier_perks", {
  tierId: text("tier_id").notNull().references(() => tiers.id, { onDelete: 'cascade' }),
  perkId: text("perk_id").notNull().references(() => perks.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asset status
export const AssetStatus = {
  AVAILABLE: 'available',
  CHECKED_OUT: 'active',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
} as const;

// Locations table (referenced by assets)
export const locations = pgTable("locations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assets table
export const assets = pgTable("assets", {
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
  mainPrice: real("main_price"),
  excellentTokenReward: integer("excellent_token_reward").default(0),
  isAddonOnly: boolean("is_addon_only").default(false),
  capacity: integer("capacity").default(1),
  isAvailable: boolean("is_available").default(true),
  maintenanceMode: boolean("maintenance_mode").default(false),
  currentLocationId: text("current_location_id").references(() => locations.id),
  location: text("location"),
  tags: json("tags"),
  lastScannedAt: timestamp("last_scanned_at"),
  lastScannedBy: text("last_scanned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assetImages = pgTable("asset_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  status: text("status").default(BookingStatus.PENDING),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalAmount: real("total_amount"),
  depositAmount: real("deposit_amount"),
  depositCaptured: boolean("deposit_captured").default(false),
  creditsUsed: text("credits_used").default('0.00'),
  paidWithCredits: boolean("paid_with_credits").default(false),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeDepositIntentId: text("stripe_deposit_intent_id"),
  qrCode: text("qr_code").unique(),
  qrToken: text("qr_token").unique(),
  checkedOutAt: timestamp("checked_out_at"),
  checkedOutBy: text("checked_out_by").references(() => users.id),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: text("checked_in_by").references(() => users.id),
  conditionStatus: text("condition_status"),
  conditionNote: text("condition_note"),
  excellentTokensAwarded: integer("excellent_tokens_awarded").default(0),
  damageNotes: text("damage_notes"),
  damagePhotos: json("damage_photos"),
  cancellationReason: text("cancellation_reason"),
  bufferEnd: timestamp("buffer_end_datetime"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tokenTransactions = pgTable("token_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  bookingId: text("booking_id").references(() => bookings.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: text("amount").notNull(),
  balanceAfter: text("balance_after").notNull(),
  description: text("description").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  processedBy: text("processed_by").references(() => users.id),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waivers = pgTable("waivers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  version: text("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userWaivers = pgTable("user_waivers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  waiverId: text("waiver_id").notNull().references(() => waivers.id),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userLocations = pgTable("user_locations", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userTierBenefits = pgTable("user_tier_benefits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  currentTierId: text("current_tier_id").notNull().references(() => tiers.id),
  tierType: text("tier_type").default(TierType.SUBSCRIPTION),
  perkId: text("perk_id").references(() => perks.id),
  monthlyAllowance: integer("monthly_allowance").default(0),
  usedThisMonth: integer("used_this_month").default(0),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loyaltyTierAchievements = pgTable("loyalty_tier_achievements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tierId: text("tier_id").notNull().references(() => tiers.id),
  monthsOfSubscription: integer("months_of_subscription").notNull(),
  achievedAt: timestamp("achieved_at").defaultNow(),
});

export const locationInventory = pgTable("location_inventory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(0),
  creditPrice: real("credit_price").default(0.00),
  lastUpdatedBy: text("last_updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const equipmentCheckouts = pgTable("equipment_checkouts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text("member_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  creditsCost: real("credits_cost").notNull(),
  issuedBy: text("issued_by").notNull().references(() => users.id),
  issuedAt: timestamp("issued_at").defaultNow(),
  returnDeadline: timestamp("return_deadline"),
  returnedAt: timestamp("returned_at"),
  returnedBy: text("returned_by").references(() => users.id),
  condition: text("condition").default('good'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assetScanHistory = pgTable("asset_scan_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: 'cascade' }),
  scannedBy: text("scanned_by").notNull().references(() => users.id),
  locationId: text("location_id").references(() => locations.id),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  bookingId: text("booking_id").references(() => bookings.id),
  notes: text("notes"),
  damageReported: boolean("damage_reported").default(false),
  scannedAt: timestamp("scanned_at").defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AdminSetting = typeof adminSettings.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  tempPassword: text("temp_password").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const waitlistLeads = pgTable("waitlist_leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  location: text("location"),
  interests: json("interests"),
  state: text("state").notNull(),
  optInMarketing: boolean("opt_in_marketing").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const waitlistEmails = pgTable("waitlist_emails", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text("lead_id").notNull().references(() => waitlistLeads.id, { onDelete: 'cascade' }),
  emailType: text("email_type").notNull(),
  followupNumber: integer("followup_number").default(0),
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").default('draft'),
  sentAt: timestamp("sent_at"),
  sentBy: text("sent_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WaitlistLead = typeof waitlistLeads.$inferSelect;
export type WaitlistEmail = typeof waitlistEmails.$inferSelect;
export const insertWaitlistLeadSchema = createInsertSchema(waitlistLeads).omit({ id: true, createdAt: true });
export type InsertWaitlistLead = z.infer<typeof insertWaitlistLeadSchema>;
export const insertWaitlistEmailSchema = createInsertSchema(waitlistEmails).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWaitlistEmail = z.infer<typeof insertWaitlistEmailSchema>;

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  email: text("email").notNull().unique(),
  state: text("state").notNull(),
  optInMarketing: boolean("opt_in_marketing").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Waitlist = typeof waitlist.$inferSelect;
export const insertWaitlistSchema = createInsertSchema(waitlist).omit({ id: true, createdAt: true });
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

export const userRoleHistory = pgTable("user_role_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  previousRole: text("previous_role"),
  newRole: text("new_role").notNull(),
  changedBy: text("changed_by").references(() => users.id),
  reason: text("reason"),
  appliedAt: timestamp("applied_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserRoleHistory = typeof userRoleHistory.$inferSelect;
export const insertUserRoleHistorySchema = createInsertSchema(userRoleHistory).omit({ id: true, createdAt: true });
export type InsertUserRoleHistory = z.infer<typeof insertUserRoleHistorySchema>;

// Type exports
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

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type SelectBooking = typeof bookings.$inferSelect;

export const insertLocationInventorySchema = createInsertSchema(locationInventory).omit({ id: true, updatedAt: true });
export type InsertLocationInventory = z.infer<typeof insertLocationInventorySchema>;
export type LocationInventory = typeof locationInventory.$inferSelect;

export const insertEquipmentCheckoutSchema = createInsertSchema(equipmentCheckouts).omit({ id: true, createdAt: true });
export type InsertEquipmentCheckout = z.infer<typeof insertEquipmentCheckoutSchema>;
export type EquipmentCheckout = typeof equipmentCheckouts.$inferSelect;

export const insertAssetScanHistorySchema = createInsertSchema(assetScanHistory).omit({ id: true, scannedAt: true });
export type InsertAssetScanHistory = z.infer<typeof insertAssetScanHistorySchema>;
export type AssetScanHistory = typeof assetScanHistory.$inferSelect;