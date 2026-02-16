import {
  users,
  memberships,
  assets,
  assetImages,
  bookings,
  waivers,
  userWaivers,
  auditLog,
  creditTransactions,
  roles,
  userRoles,
  locations,
  userLocations,
  tiers,
  perks,
  tierPerks,
  locationInventory,
  loyaltyTierAchievements,
  passwordResetTokens,
  userRoleHistory,
  type User,
  type UpsertUser,
  type Membership,
  type Asset,
  type AssetImage,
  type Booking,
  type Waiver,
  type UserWaiver,
  type InsertAsset,
  type InsertBooking,
  type InsertMembership,
  type InsertCreditTransaction,
  type CreditTransaction,
  type LocationInventory,
  type InsertLocationInventory,
  type PasswordResetToken,
  type UserRoleHistory,
} from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, gt, lt, desc, or, sql } from "drizzle-orm";
import { CreditTransactionType } from "@shared/schema";

// Interface for storage operations - enhanced for Adam's Club
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  getPasswordHash(userId: string): Promise<string | null>;

  // Membership operations
  createMembership(membership: InsertMembership): Promise<Membership>;
  getMembershipByUserId(userId: string): Promise<Membership | undefined>;
  updateMembershipStatus(id: string, status: string): Promise<void>;

  // Asset operations
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssets(filters?: { type?: string; category?: string; available?: boolean }): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  updateAssetAvailability(id: string, isAvailable: boolean): Promise<void>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByUserId(userId: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByQRCode(qrCode: string): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<void>;
  checkBookingConflicts(assetId: string, startDate: Date, endDate: Date, excludeBookingId?: string): Promise<boolean>;
  findAvailableAsset(type: string, startDate: Date, endDate: Date): Promise<Asset | undefined>;

  // Waiver operations
  getActiveWaiver(): Promise<Waiver | undefined>;
  hasUserAcceptedCurrentWaiver(userId: string): Promise<boolean>;
  recordWaiverAcceptance(userId: string, waiverId: string, ipAddress?: string, userAgent?: string): Promise<UserWaiver>;

  // Adventure Credits operations
  getUserCredits(userId: string): Promise<string>; // Returns current credit balance as string
  addCredits(userId: string, amount: number, type: keyof typeof CreditTransactionType, description: string, relatedEntityType?: string, relatedEntityId?: string, stripePaymentIntentId?: string, processedBy?: string): Promise<CreditTransaction>;
  spendCredits(userId: string, amount: number, description: string, relatedEntityType?: string, relatedEntityId?: string): Promise<CreditTransaction>;
  getCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  createBookingWithCredits(bookingData: Omit<InsertBooking, 'creditsUsed' | 'paidWithCredits'>, creditAmount?: number): Promise<Booking>;

  // Subscription operations (new)
  updateUserSubscription(userId: string, subscriptionData: any): Promise<void>;

  // Credit operations (new)
  addUserCredits(userId: string, creditsToAdd: number): Promise<void>;

  // RBAC operations (new)
  getUserRoles(userId: string): Promise<any[]>;
  getUserLocations(userId: string): Promise<any[]>;
  getUserMembership(userId: string): Promise<any | null>;
  getTierPerks(tierName: string): Promise<any[]>;
  assignUserRole(userId: string, roleName: string): Promise<void>;
  assignUserLocation(userId: string, locationCode: string): Promise<void>;

  // Location inventory operations
  getLocationInventory(locationId: string): Promise<LocationInventory[]>;
  getAssetInventoryAtLocation(locationId: string, assetId: string): Promise<LocationInventory | undefined>;
  updateAssetInventory(locationId: string, assetId: string, quantity: number, userId: string): Promise<LocationInventory>;
  initializeLocationInventory(locationId: string, assetId: string): Promise<LocationInventory>;

  // Password reset operations
  createPasswordResetToken(userId: string, tempPassword: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(tokenId: string): Promise<void>;
  getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;

  // Role history operations
  getRoleHistory(userId: string, limit?: number): Promise<UserRoleHistory[]>;
  getLatestRoleBackup(userId: string): Promise<UserRoleHistory | undefined>;
  createRoleBackup(userId: string, previousRole: string | null, newRole: string, changedBy?: string, reason?: string): Promise<UserRoleHistory>;

  // Audit log operations
  createAuditLog(log: { userId: string; action: string; entityType: string; entityId: string; newValues: any; oldValues?: any; ipAddress?: string; userAgent?: string }): Promise<void>;

  // Credit transaction operations (direct)
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) return undefined;

    // Get subscription information
    const subscription = await this.getUserSubscription(id);

    return {
      ...user,
      subscriptionPlan: subscription?.plan || null,
      subscriptionStatus: subscription?.status || null
    };
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.googleId, googleId)).then(rows => rows[0]);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    if (!userData.id) throw new Error('User ID is required');
    const existingUser = await this.getUser(userData.id);

    if (existingUser) {
      // For existing users, only update fields that are provided
      // Never override credits or other sensitive data unless explicitly provided
      const updateData: any = {
        ...userData,
        updatedAt: new Date(),
      };

      // Preserve existing credits if not explicitly updating them
      if (userData.adamsCredits === undefined) {
        delete updateData.adamsCredits;
      }

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    } else {
      // New user - ensure defaults are set
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          adamsCredits: userData.adamsCredits || '0.00',
          role: userData.role || 'member',
          waiverAccepted: userData.waiverAccepted || false,
          marketingOptIn: userData.marketingOptIn || false,
        })
        .returning();
      return user;
    }
  }

  async updateUserRole(userId: string, role: string, changedBy?: string, reason?: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    // Create backup before updating
    await this.createRoleBackup(userId, user.role || null, role, changedBy, reason);

    // Update the role
    await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete related records first to avoid foreign key constraint violations
    try {
      await db.delete(bookings).where(eq(bookings.userId, userId));
    } catch (e) {
      // Table may not exist, continue
    }
    try {
      await db.delete(creditTransactions).where(eq(creditTransactions.userId, userId));
    } catch (e) {
      // Table may not exist, continue
    }
    try {
      await db.delete(memberships).where(eq(memberships.userId, userId));
    } catch (e) {
      // Table may not exist, continue
    }
    try {
      await db.delete(userWaivers).where(eq(userWaivers.userId, userId));
    } catch (e) {
      // Table may not exist, continue
    }
    // Delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async addUserCredits(userId: string, creditsToAdd: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get current credits balance
    const currentCredits = parseFloat(user.adamsCredits || '0.00');

    // Add the new credits to the existing balance
    const newBalance = currentCredits + creditsToAdd;

    await db
      .update(users)
      .set({
        adamsCredits: newBalance.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // New methods for password storage
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedMetadata = {
      ...(user.metadata || {}),
      passwordHash
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    // Get the raw user record to check both password and metadata fields
    const [rawUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!rawUser) {
      return null;
    }

    // Check password column first (for backward compatibility)
    if (rawUser.password) {
      return rawUser.password;
    }

    // Check metadata for passwordHash (for new password storage method)
    if (rawUser.metadata && (rawUser.metadata as any).passwordHash) {
      return (rawUser.metadata as any).passwordHash;
    }

    return null;
  }

  // Membership operations
  async createMembership(membershipData: InsertMembership): Promise<Membership> {
    const [membership] = await db
      .insert(memberships)
      .values(membershipData)
      .returning();
    return membership;
  }

  async getMembershipByUserId(userId: string): Promise<Membership | undefined> {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId));
    return membership || undefined;
  }

  async updateMembershipStatus(id: string, status: string): Promise<void> {
    await db
      .update(memberships)
      .set({ status, updatedAt: new Date() })
      .where(eq(memberships.id, id));
  }

  // Asset operations
  async createAsset(assetData: InsertAsset): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values(assetData)
      .returning();
    return asset;
  }

  async getAssets(filters?: { type?: string; category?: string; available?: boolean }): Promise<Asset[]> {
    let query = db.select().from(assets);

    if (filters) {
      const conditions = [];
      if (filters.type) conditions.push(eq(assets.type, filters.type as any));
      if (filters.category) conditions.push(eq(assets.category, filters.category));
      if (filters.available !== undefined) conditions.push(eq(assets.isAvailable, filters.available));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }

    return await query;
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async updateAssetAvailability(id: string, isAvailable: boolean): Promise<void> {
    await db
      .update(assets)
      .set({ isAvailable, updatedAt: new Date() })
      .where(eq(assets.id, id));
  }

  // Booking operations
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const endDate = new Date(bookingData.endDate);
    const bufferEnd = new Date(endDate.getTime() + 60 * 60 * 1000); // 1 hour buffer
    const qrToken = `ACB-${crypto.randomUUID()}`;

    const [booking] = await db
      .insert(bookings)
      .values({
        ...bookingData,
        bufferEnd,
        qrToken,
        qrCode: qrToken, // Use same for backward compat if needed
      })
      .returning();
    return booking;
  }

  async getBookingByQRToken(qrToken: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(
      or(eq(bookings.qrToken, qrToken), eq(bookings.qrCode, qrToken))
    );
    return booking || undefined;
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.startDate));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }


  async updateBookingStatus(id: string, status: string): Promise<void> {
    await db
      .update(bookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bookings.id, id));
  }

  async checkBookingConflicts(
    assetId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    // Buffer Logic:
    // 1. New booking [Start, End] + New Buffer [End+1hr]
    // 2. Existing booking [ExStart, ExEnd] + Ex Buffer [ExBufferEnd]
    // Conflict if:
    // - New Start falls within Existing [Start, BufferEnd]
    // - New BufferEnd falls within Existing [Start, BufferEnd]
    // - Existing Start falls within New [Start, BufferEnd]

    // We treat the "Busy Time" of any booking as [Start, BufferEnd].
    // So simply check if ranges overlap.
    const newBufferEnd = new Date(endDate.getTime() + 60 * 60 * 1000);

    const baseConditions = [
      eq(bookings.assetId, assetId),
      // Check for active/confirmed bookings only? usually pending also blocks
      or(
        eq(bookings.status, 'pending'),
        eq(bookings.status, 'active'),
        eq(bookings.status, 'completed')
      ),
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      // Here Range A = New Booking [startDate, newBufferEnd]
      // Range B = Existing Booking [bookings.startDate, bookings.bufferEnd]
      and(
        lt(bookings.startDate, newBufferEnd),
        gt(bookings.bufferEnd, startDate)
      )
    ];

    let query = db.select().from(bookings).where(and(...baseConditions));

    // Filter out cancelled bookings explicitly if needed (redundant with the 'or' block above but safe)
    // Actually the 'or' block above already limits statuses.
    
    const conflicts = await query;
    
    // Final check for ID exclusion
    const filteredConflicts = excludeBookingId 
      ? conflicts.filter(c => c.id !== excludeBookingId)
      : conflicts;

    return filteredConflicts.length > 0;
  }

  async findAvailableAsset(type: string, startDate: Date, endDate: Date): Promise<Asset | undefined> {
    const candidateAssets = await this.getAssets({ type, available: true });

    for (const asset of candidateAssets) {
      const hasConflict = await this.checkBookingConflicts(asset.id, startDate, endDate);
      if (!hasConflict) {
        return asset;
      }
    }

    return undefined;
  }

  async findAvailableAssetByCategory(requestedType: string, requestedTitle: string, startDate: Date, endDate: Date): Promise<Asset | undefined> {
    const allAssets = await this.getAssets({ available: true });

    const categoryKeywords: Record<string, string[]> = {
      'kayak': ['kayak', 'canoe', 'paddle', 'water'],
      'bike': ['bike', 'bicycle', 'cycling', 'mountain bike'],
      'camping': ['camp', 'tent', 'sleeping', 'camping'],
      'hiking': ['hike', 'hiking', 'trek', 'trail', 'backpack'],
    };

    const keywords = categoryKeywords[requestedType] || [requestedType];

    const matchingAssets = allAssets.filter(asset => {
      const name = (asset.name || '').toLowerCase();
      const category = (asset.category || '').toLowerCase();
      const desc = (asset.description || '').toLowerCase();

      return keywords.some(kw =>
        name.includes(kw) || category.includes(kw) || desc.includes(kw)
      );
    });

    if (matchingAssets.length === 0 && requestedTitle) {
      const titleWords = requestedTitle.split(/\s+/).filter(w => w.length > 2);
      const titleMatches = allAssets.filter(asset => {
        const name = (asset.name || '').toLowerCase();
        return titleWords.some(word => name.includes(word));
      });

      for (const asset of titleMatches) {
        const hasConflict = await this.checkBookingConflicts(asset.id, startDate, endDate);
        if (!hasConflict) return asset;
      }
    }

    for (const asset of matchingAssets) {
      const hasConflict = await this.checkBookingConflicts(asset.id, startDate, endDate);
      if (!hasConflict) return asset;
    }

    return undefined;
  }

  // Waiver operations
  async getActiveWaiver(): Promise<Waiver | undefined> {
    const [waiver] = await db
      .select()
      .from(waivers)
      .where(eq(waivers.isActive, true))
      .orderBy(desc(waivers.createdAt));
    return waiver || undefined;
  }

  async hasUserAcceptedCurrentWaiver(userId: string): Promise<boolean> {
    const activeWaiver = await this.getActiveWaiver();
    if (!activeWaiver) return true; // No waiver required

    const [acceptance] = await db
      .select()
      .from(userWaivers)
      .where(
        and(
          eq(userWaivers.userId, userId),
          eq(userWaivers.waiverId, activeWaiver.id)
        )
      );

    return !!acceptance;
  }

  async recordWaiverAcceptance(
    userId: string,
    waiverId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserWaiver> {
    const [acceptance] = await db
      .insert(userWaivers)
      .values({
        userId,
        waiverId,
        ipAddress,
        userAgent,
      })
      .returning();
    return acceptance;
  }

  // Adventure Credits operations
  async getUserCredits(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    return user?.adamsCredits || '0.00';
  }

  async addCredits(
    userId: string,
    amount: number,
    type: keyof typeof CreditTransactionType,
    description: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
    stripePaymentIntentId?: string,
    processedBy?: string
  ): Promise<CreditTransaction> {
    // Validate inputs
    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new Error('Credit amount must be a positive number');
    }
    if (amount > 999999.99) {
      throw new Error('Credit amount exceeds maximum allowed');
    }
    if (!Object.keys(CreditTransactionType).includes(type)) {
      throw new Error(`Invalid transaction type: ${type}`);
    }

    return db.transaction((tx) => {
      // Get current balance
      // Synchronous usage for better-sqlite3: .all() returns result array
      const [user] = tx.select().from(users).where(eq(users.id, userId)).all();
      if (!user) throw new Error('User not found');

      const currentBalance = parseFloat(user.adamsCredits || '0.00');
      const newBalance = currentBalance + amount;

      // Update user's credit balance
      // Synchronous usage: .run() executes the statement
      tx
        .update(users)
        .set({
          adamsCredits: newBalance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .run();

      // Record transaction
      const transactionId = crypto.randomUUID();
      const transaction = {
        id: transactionId,
        userId,
        // Ensure type key matches the enum value; user passes string key, we use enum value
        type: CreditTransactionType[type],
        amount: amount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
        stripePaymentIntentId: stripePaymentIntentId || null,
        processedBy: processedBy || null,
        metadata: null,
        createdAt: new Date()
      };

      tx
        .insert(creditTransactions)
        .values({
          ...transaction
        })
        .run();

      return transaction;
    });
  }

  async spendCredits(
    userId: string,
    amount: number,
    description: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ): Promise<CreditTransaction> {
    // Validate inputs
    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new Error('Credit amount must be a positive number');
    }
    if (amount > 999999.99) {
      throw new Error('Credit amount exceeds maximum allowed');
    }

    return db.transaction((tx) => {
      // Get current balance
      const [user] = tx.select().from(users).where(eq(users.id, userId)).all();
      if (!user) throw new Error('User not found');

      const currentBalance = parseFloat(user.adamsCredits || '0.00');

      if (currentBalance < amount) {
        throw new Error(`Insufficient Adams Credits. Available: ${currentBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`);
      }

      const newBalance = currentBalance - amount;

      // Update user's credit balance
      tx
        .update(users)
        .set({
          adamsCredits: newBalance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .run();

      // Record transaction (negative amount for spending)
      const transactionId = crypto.randomUUID();
      const transaction = {
        id: transactionId,
        userId,
        type: CreditTransactionType.SPEND,
        amount: (-amount).toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description,
        relatedEntityType: relatedEntityType || null,
        relatedEntityId: relatedEntityId || null,
        stripePaymentIntentId: null,
        processedBy: null,
        metadata: null,
        createdAt: new Date()
      };

      tx
        .insert(creditTransactions)
        .values({
          ...transaction,
          // ensure fields match schema (createdAt defaults to now if omitted, but we set it)
        })
        .run();

      return transaction;
    });
  }

  async getCreditTransactions(userId: string, limit: number = 20): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  // Integrated booking with credits
  async createBookingWithCredits(
    bookingData: Omit<InsertBooking, 'creditsUsed' | 'paidWithCredits'>,
    creditAmount?: number
  ): Promise<Booking> {
    return db.transaction((tx) => {
      let actualCreditsUsed = 0;
      let paidWithCredits = false;

      if (creditAmount && creditAmount > 0) {
        if (creditAmount <= 0 || !Number.isFinite(creditAmount)) {
          throw new Error('Credit amount must be a positive number');
        }

        const [user] = tx.select().from(users).where(eq(users.id, bookingData.userId)).all();
        if (!user) throw new Error('User not found');

        const currentBalance = parseFloat(user.adamsCredits || '0.00');
        console.log(`[BOOKING_TX] Credit balance before: ${currentBalance}, cost: ${creditAmount}`);
        if (currentBalance < creditAmount) {
          throw new Error(`Insufficient Adams Credits. Available: ${currentBalance.toFixed(2)}, Required: ${creditAmount.toFixed(2)}`);
        }

        const newBalance = currentBalance - creditAmount;
        tx
          .update(users)
          .set({
            adamsCredits: newBalance.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(users.id, bookingData.userId))
          .run();

        actualCreditsUsed = creditAmount;
        paidWithCredits = creditAmount >= (bookingData.totalAmount || 0);

        console.log(`[BOOKING_TX] Credits deducted: ${creditAmount}, new balance: ${newBalance}`);
      }

      const bookingId = crypto.randomUUID();
      console.log(`[BOOKING_TX] Creating booking ${bookingId} for asset ${bookingData.assetId}`);

      const qrToken = `ACB-${crypto.randomUUID()}`;
      const endDate = new Date(bookingData.endDate);
      const bufferEnd = new Date(endDate.getTime() + 60 * 60 * 1000);
      tx
        .insert(bookings)
        .values({
          ...bookingData,
          id: bookingId,
          creditsUsed: actualCreditsUsed.toFixed(2),
          paidWithCredits,
          qrToken,
          qrCode: qrToken,
          bufferEnd,
        })
        .run();

      const [booking] = tx.select().from(bookings).where(eq(bookings.id, bookingId)).all();

      if (actualCreditsUsed > 0) {
        const [updatedUser] = tx.select().from(users).where(eq(users.id, bookingData.userId)).all();
        const balanceAfter = updatedUser?.adamsCredits || '0.00';
        tx
          .insert(creditTransactions)
          .values({
            id: crypto.randomUUID(),
            userId: bookingData.userId,
            type: CreditTransactionType.SPEND,
            amount: (-creditAmount!).toFixed(2),
            balanceAfter,
            description: `Payment for booking ${bookingId}`,
            relatedEntityType: 'booking',
            relatedEntityId: bookingId,
            createdAt: new Date()
          })
          .run();
      }

      console.log(`[BOOKING_TX] Transaction committed - booking ${bookingId} created`);
      return booking;
    });
  }

  // RBAC Methods
  async getUserRoles(userId: string) {
    return await db.select({
      id: roles.id,
      name: roles.name,
      description: roles.description
    })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
  }

  async getUserLocations(userId: string) {
    return await db.select({
      id: locations.id,
      code: locations.code,
      name: locations.name
    })
      .from(userLocations)
      .innerJoin(locations, eq(userLocations.locationId, locations.id))
      .where(eq(userLocations.userId, userId));
  }

  async getUserMembership(userId: string) {
    const result = await db.select({
      tier: tiers.name,
      status: memberships.status
    })
      .from(memberships)
      .innerJoin(tiers, eq(memberships.plan, tiers.name))
      .where(eq(memberships.userId, userId))
      .limit(1);

    return result[0] || null;
  }

  async getTierPerks(tierName: string) {
    return await db.select({
      id: perks.id,
      name: perks.name,
      description: perks.description
    })
      .from(tierPerks)
      .innerJoin(tiers, eq(tierPerks.tierId, tiers.id))
      .innerJoin(perks, eq(tierPerks.perkId, perks.id))
      .where(eq(tiers.name, tierName));
  }

  async assignUserRole(userId: string, roleName: string) {
    const role = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    if (!role[0]) {
      throw new Error(`Role ${roleName} not found`);
    }

    await db.insert(userRoles).values({
      userId,
      roleId: role[0].id
    }).onConflictDoNothing();
  }

  async assignUserLocation(userId: string, locationCode: string) {
    const location = await db.select().from(locations).where(eq(locations.code, locationCode)).limit(1);
    if (!location[0]) {
      throw new Error(`Location ${locationCode} not found`);
    }

    await db.insert(userLocations).values({
      userId,
      locationId: location[0].id
    }).onConflictDoNothing();
  }

  // Subscription plan tracking methods
  async updateUserSubscription(userId: string, subscriptionData: any): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has an existing membership
    const [existingMembership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);

    const plan = subscriptionData.plan as "base" | "premium" | "vip" | "employee";
    const status = subscriptionData.status || 'active';

    if (existingMembership) {
      // Update existing membership
      await db
        .update(memberships)
        .set({
          plan,
          status,
          updatedAt: new Date()
        })
        .where(eq(memberships.userId, userId));
    } else {
      // Create new membership
      await db
        .insert(memberships)
        .values({
          userId,
          plan,
          status
        });
    }
  }

  async getUserSubscription(userId: string) {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);

    return membership || null;
  }

  // Check if user has an active subscription
  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trialing';
  }

  // Audit log operations
  async createAuditLog(log: { userId: string; action: string; entityType: string; entityId: string; newValues: any; oldValues?: any; ipAddress?: string; userAgent?: string }): Promise<void> {
    await db.insert(auditLog).values({
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      newValues: log.newValues,
      oldValues: log.oldValues,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    });
  }

  // Credit transaction operations
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [result] = await db.insert(creditTransactions).values(transaction).returning();
    return result;
  }


  // Auto-calculate and award loyalty tiers based on subscription duration
  async calculateLoyaltyTierAchievements(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || subscription.status !== 'active') return;

      // Get all loyalty tiers sorted by months required (ascending)
      const loyaltyTiers = await db
        .select()
        .from(tiers)
        .where(and(eq(tiers.type, 'loyalty'), eq(tiers.isActive, true)))
        .orderBy(tiers.monthsRequired || 0);

      if (loyaltyTiers.length === 0) return;

      // Calculate months of active subscription
      const createdAt = new Date(subscription.createdAt || new Date());
      const now = new Date();
      const monthsActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

      // Check each loyalty tier and award if qualified
      for (const tier of loyaltyTiers) {
        const monthsRequired = tier.monthsRequired || 0;

        if (monthsActive >= monthsRequired) {
          // Check if already achieved
          const existing = await db
            .select()
            .from(loyaltyTierAchievements)
            .where(and(
              eq(loyaltyTierAchievements.userId, userId),
              eq(loyaltyTierAchievements.tierId, tier.id)
            ))
            .limit(1);

          if (existing.length === 0) {
            // Award the loyalty tier
            await db.insert(loyaltyTierAchievements).values({
              userId,
              tierId: tier.id,
              monthsOfSubscription: monthsActive,
              achievedAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error calculating loyalty tier achievements:', error);
      // Don't throw - this is a background operation
    }
  }

  // Location inventory operations
  async getLocationInventory(locationId: string): Promise<LocationInventory[]> {
    return db.select().from(locationInventory).where(eq(locationInventory.locationId, locationId));
  }

  async getAssetInventoryAtLocation(locationId: string, assetId: string): Promise<LocationInventory | undefined> {
    const [inventory] = await db
      .select()
      .from(locationInventory)
      .where(and(eq(locationInventory.locationId, locationId), eq(locationInventory.assetId, assetId)))
      .limit(1);
    return inventory;
  }

  async updateAssetInventory(locationId: string, assetId: string, quantity: number, userId: string): Promise<LocationInventory> {
    const existing = await this.getAssetInventoryAtLocation(locationId, assetId);

    if (existing) {
      const [updated] = await db
        .update(locationInventory)
        .set({ quantity, lastUpdatedBy: userId, updatedAt: new Date() })
        .where(and(eq(locationInventory.locationId, locationId), eq(locationInventory.assetId, assetId)))
        .returning();
      return updated;
    } else {
      return this.initializeLocationInventory(locationId, assetId);
    }
  }

  async initializeLocationInventory(locationId: string, assetId: string): Promise<LocationInventory> {
    const [inventory] = await db
      .insert(locationInventory)
      .values({ locationId, assetId, quantity: 0 })
      .returning();
    return inventory;
  }

  // Password reset operations
  async createPasswordResetToken(userId: string, tempPassword: string, expiresAt: Date): Promise<PasswordResetToken> {
    const token = Math.random().toString(36).substr(2, 12).toUpperCase();
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, tempPassword, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const resetToken = await this.getPasswordResetToken(token);
    if (!resetToken) return undefined;
    if (resetToken.usedAt) return undefined;
    if (new Date() > resetToken.expiresAt) return undefined;
    return resetToken;
  }

  // Role history operations
  async getRoleHistory(userId: string, limit: number = 10): Promise<UserRoleHistory[]> {
    return await db
      .select()
      .from(userRoleHistory)
      .where(eq(userRoleHistory.userId, userId))
      .orderBy(desc(userRoleHistory.appliedAt))
      .limit(limit);
  }

  async getLatestRoleBackup(userId: string): Promise<UserRoleHistory | undefined> {
    const [history] = await db
      .select()
      .from(userRoleHistory)
      .where(eq(userRoleHistory.userId, userId))
      .orderBy(desc(userRoleHistory.appliedAt))
      .limit(1);
    return history;
  }

  async createRoleBackup(userId: string, previousRole: string | null, newRole: string, changedBy?: string, reason?: string): Promise<UserRoleHistory> {
    const [backup] = await db
      .insert(userRoleHistory)
      .values({
        userId,
        previousRole: previousRole as any,
        newRole: newRole as any,
        changedBy,
        reason,
      })
      .returning();

    // Keep only last 2 backups per user
    const history = await db
      .select()
      .from(userRoleHistory)
      .where(eq(userRoleHistory.userId, userId))
      .orderBy(desc(userRoleHistory.appliedAt));

    if (history.length > 2) {
      const oldBackups = history.slice(2);
      for (const oldBackup of oldBackups) {
        await db.delete(userRoleHistory).where(eq(userRoleHistory.id, oldBackup.id));
      }
    }

    return backup;
  }
}

export const storage = new DatabaseStorage();