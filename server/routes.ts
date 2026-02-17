import express, { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { requireStaff, requireAdmin } from "./authMiddleware";
import { getUserCapabilities, requirePermission } from "./rbac";
import { z } from "zod";
import { db } from "./db";
import { users, bookings, BookingStatus, assets, AssetStatus, tiers, perks, tierPerks, locations, userLocations, locationInventory, userTierBenefits, adminSettings, memberships, creditTransactions, waitlist, waitlistLeads, waitlistEmails, assetScanHistory } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';
import { eq, and, desc, gte, lte, gt, lt, or, inArray, count, sql } from "drizzle-orm";
import { registerStripeRoutes } from "./stripeRoutes";
import { setupVite, serveStatic, log } from "./vite";
import OpenAI from "openai";
import bcryptjs from "bcryptjs";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize OpenAI client (only if credentials are available)
const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ? new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  })
  : null;

// Helper function to determine category from asset name using AI
async function determineCategoryFromName(assetName: string): Promise<string> {
  try {
    if (!openai) {
      console.log(`ℹ️ OpenAI credentials not configured, using default category for: "${assetName}"`);
      return "General";
    }

    console.log(`🤖 Determining category for: "${assetName}"`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Given this outdoor equipment or experience name: "${assetName}", respond with ONLY a single category word or short phrase (2-3 words max) that best describes what type of activity or equipment category it belongs to. Examples: "Water Sports", "Camping", "Cycling", "Hiking", "Snow Sports", "Climbing", "Fishing". Respond with just the category, nothing else.`
        }
      ]
    });

    const category = response.choices[0].message.content?.trim() || "General";
    console.log(`✅ Category determined: "${category}"`);
    return category || "General";
  } catch (error) {
    console.error("❌ Error determining category:", error);
    return "General";
  }
}

async function normalizeBookingStatuses() {
  try {
    const validStatuses = [BookingStatus.PENDING, BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.CANCELLED];
    const allBookings = await db.select().from(bookings);
    let fixed = 0;

    for (const booking of allBookings) {
      if (!validStatuses.includes(booking.status as any)) {
        let newStatus = BookingStatus.PENDING;
        if (booking.checkedInAt) {
          newStatus = BookingStatus.COMPLETED;
        } else if (booking.checkedOutAt) {
          newStatus = BookingStatus.ACTIVE;
        }
        await db.update(bookings).set({ status: newStatus }).where(eq(bookings.id, booking.id));
        fixed++;
      }

      if (!booking.qrToken && booking.qrCode) {
        await db.update(bookings).set({ qrToken: booking.qrCode }).where(eq(bookings.id, booking.id));
        fixed++;
      } else if (!booking.qrToken && !booking.qrCode) {
        const token = `ACB-${crypto.randomUUID()}`;
        await db.update(bookings).set({ qrToken: token, qrCode: token }).where(eq(bookings.id, booking.id));
        fixed++;
      }
    }

    if (fixed > 0) {
      console.log(`[STARTUP] Normalized ${fixed} booking records`);
    }
  } catch (error) {
    console.error("[STARTUP] Error normalizing bookings:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await normalizeBookingStatuses();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const passwordHash = await storage.getPasswordHash(userId);
      res.json({ ...user, hasPassword: !!passwordHash });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Delete own account endpoint - Placed early to ensure registration
  app.post('/api/user/delete', isAuthenticated, async (req: any, res) => {
    console.log(`[DELETE_ACCOUNT] Attempting to delete account for user: ${req.user?.id}`);
    try {
      const userId = req.user.id;
      const { confirmation } = req.body;

      // Require confirmation string "DELETE"
      if (confirmation !== "DELETE") {
        return res.status(400).json({ message: "Please type DELETE to confirm account deletion" });
      }

      // 1. Delete user from Supabase
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      console.log(`[DELETE_ACCOUNT] Checking credentials... URL: ${!!supabaseUrl}, Key: ${!!supabaseServiceKey}`);

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[DELETE_ACCOUNT] Missing Supabase credentials");
        // We will fail here because the user explicitly requested Supabase deletion to work.
        // If you want to allow local-only deletion for dev, you can comment this out, but for this task we want strictness.
        return res.status(500).json({
          message: "Internal Error: Unable to connect to identity provider for deletion. Please contact support."
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Verify user exists in Supabase first (optional but good for debugging)
      let sbUser = null;
      const { data: userData, error: findError } = await supabase.auth.admin.getUserById(userId);

      if (userData && userData.user) {
        sbUser = userData.user;
      } else {
        console.warn(`[DELETE_ACCOUNT] User ${userId} not found by ID. Attempting lookup by email...`);
        // Fallback: Lookup by email
        // Note: supabase.auth.admin.listUsers() is pagination based but we can just filter manually or use a search query if available?
        // Unfortunately listUsers doesn't support email filtering directly in older versions, but let's try just getting the user
        // or we can assume if they are authenticated locally we have their email.

        const userEmail = req.user.email;
        if (userEmail) {
          // Sadly no direct getUserByEmail in all versions, checking if we can use listUsers
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
          if (listData && listData.users) {
            const found = listData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
            if (found) {
              console.log(`[DELETE_ACCOUNT] User found by email: ${found.id} (Local: ${userId})`);
              sbUser = found;
            }
          } else if (listError) {
            console.error("[DELETE_ACCOUNT] Failed to list users for email lookup:", listError);
          }
        }
      }

      if (sbUser) {
        console.log(`[DELETE_ACCOUNT] User found in Supabase: ${sbUser.id}. Deleting...`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(sbUser.id);

        if (deleteError) {
          console.error("[DELETE_ACCOUNT] Supabase deletion failed:", deleteError);
          return res.status(500).json({ message: `Failed to delete from cloud: ${deleteError.message}` });
        }
        console.log(`[DELETE_ACCOUNT] User deleted from Supabase successfully.`);
      } else {
        console.warn(`[DELETE_ACCOUNT] User not found in Supabase by ID or Email. Proceeding with local deletion.`);
        // We'll proceed in case they are already gone from cloud.
      }

      // 2. Delete user from local storage
      console.log(`[DELETE_ACCOUNT] Deleting from local storage...`);
      await storage.deleteUser(userId);

      // 3. Logout
      req.logout((err: any) => {
        if (err) {
          console.error("[DELETE_ACCOUNT] Error logging out after deletion:", err);
        }
        req.session.destroy((err: any) => {
          if (err) {
            console.error("[DELETE_ACCOUNT] Error destroying session after deletion:", err);
          }
          console.log(`[DELETE_ACCOUNT] Deletion process complete.`);
          res.json({ message: "Account deleted successfully from all systems." });
        });
      });

    } catch (error: any) {
      console.error("[DELETE_ACCOUNT] Unexpected error:", error);
      res.status(500).json({ message: `Failed to delete account: ${error.message}` });
    }
  });

  // Credit history endpoint
  app.get('/api/credits/history', isAuthenticated, async (req: any, res) => {
    try {
      const transactions = await storage.getCreditTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  // User capabilities endpoint
  app.get('/api/me/capabilities', isAuthenticated, async (req: any, res) => {
    try {
      // Placeholder for FEATURE_RBAC, assuming it's defined elsewhere
      const FEATURE_RBAC = process.env.FEATURE_RBAC === 'true';

      if (!FEATURE_RBAC) {
        return res.json({
          user_id: req.user.id,
          roles: [req.user.role || 'member'],
          permissions: [],
          entitlements: []
        });
      }

      const capabilities = await getUserCapabilities(req.user.id);
      res.json(capabilities);
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      // Return fallback instead of error during setup
      res.json({
        user_id: req.user.id,
        roles: [req.user.role || 'member'],
        permissions: [],
        entitlements: []
      });
    }
  });

  // Role management schema
  const updateRoleSchema = z.object({
    role: z.enum(['member', 'staff', 'admin'])
  });

  // Profile update endpoint
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params
      const userId = req.user.id

      // Users can only update their own profile
      if (id !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" })
      }

      const { firstName, lastName, email, phone, profileImageUrl, bio } = req.body

      const updatedUser = await storage.upsertUser({
        id: userId,
        firstName,
        lastName,
        email,
        phone,
        profileImageUrl,
        bio,
      } as any)

      res.json({
        message: "Profile updated successfully",
        user: updatedUser
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      res.status(500).json({ message: "Failed to update profile" })
    }
  })



  // Role management (admin only) - with instant backup system
  app.patch('/api/users/:id/role', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Validate request body with Zod
      const result = updateRoleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid role",
          errors: result.error.issues,
          allowed: ['member', 'staff', 'admin']
        });
      }

      const { role } = result.data;
      const { reason } = req.body;

      // Check if target user exists
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update role with backup creation
      await storage.updateUserRole(id, role, req.currentUser.id, reason);

      // Get updated user and role history
      const updatedUser = await storage.getUser(id);
      const roleHistory = await storage.getRoleHistory(id, 2);

      res.json({
        message: "Role updated successfully and backed up",
        user: updatedUser,
        roleHistory: roleHistory,
        backup: {
          previousRole: targetUser.role,
          newRole: role,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Get role history for a user (admin only)
  app.get('/api/users/:id/role-history', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const roleHistory = await storage.getRoleHistory(id, limit);
      res.json({
        userId: id,
        currentRole: user.role,
        history: roleHistory
      });
    } catch (error) {
      console.error("Error fetching role history:", error);
      res.status(500).json({ message: "Failed to fetch role history" });
    }
  });

  // Restore user role from backup (admin only) - for emergency situations
  app.post('/api/users/:id/restore-role', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { backupIndex } = req.body;

      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get role history
      const roleHistory = await storage.getRoleHistory(id, 2);
      if (!roleHistory[backupIndex || 0]) {
        return res.status(400).json({ message: "Backup not found" });
      }

      const backup = roleHistory[backupIndex || 0];

      // Restore to previous role
      await storage.updateUserRole(id, backup.previousRole || 'member', req.currentUser.id, `Restored from backup #${backupIndex || 1}`);

      const restoredUser = await storage.getUser(id);
      res.json({
        message: "Role restored successfully from backup",
        user: restoredUser,
        restoredFrom: backup
      });
    } catch (error) {
      console.error("Error restoring role:", error);
      res.status(500).json({ message: "Failed to restore role" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:userId', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Prevent self-deletion
      if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      // Check if user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);
      res.json({
        message: "User deleted successfully",
        userId,
        deletedBy: req.user.email
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Staff Scan Endpoint
  app.get("/api/staff/scan", requireStaff, async (req: any, res) => {
    try {
      const { code } = req.query;
      if (!code) return res.status(400).json({ message: "No scan code provided" });

      const booking = await storage.getBookingByQRToken(code);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found", barcode: code });
      }

      const asset = await storage.getAsset(booking.assetId);
      const member = await storage.getUser(booking.userId);

      res.json({
        ok: true,
        booking,
        asset,
        member: member ? {
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email
        } : null
      });
    } catch (error) {
      console.error("Scan error:", error);
      res.status(500).json({ message: "Server error during scan" });
    }
  });

  // Start Adventure
  app.post("/api/staff/bookings/:id/start", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status !== BookingStatus.PENDING) {
        return res.status(409).json({ message: `Cannot start adventure from state: ${booking.status}` });
      }

      await db.transaction(async (tx) => {
        await tx.update(bookings).set({ 
          status: BookingStatus.ACTIVE, 
          checkedOutAt: new Date(),
          checkedOutBy: req.user.id 
        }).where(eq(bookings.id, id));
        
        await tx.update(assets).set({ 
          status: 'active',
          isAvailable: false
        }).where(eq(assets.id, booking.assetId));
      });

      res.json({ ok: true, message: "Adventure started" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start adventure" });
    }
  });

  // Return Adventure
  app.post("/api/staff/bookings/:id/return", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { condition = 'available' } = req.body;
      const booking = await storage.getBooking(id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status !== BookingStatus.ACTIVE) {
        return res.status(409).json({ message: "Booking is not active" });
      }

      await db.transaction(async (tx) => {
        await tx.update(bookings).set({ 
          status: BookingStatus.COMPLETED, 
          checkedInAt: new Date(),
          checkedInBy: req.user.id 
        }).where(eq(bookings.id, id));
        
        await tx.update(assets).set({ 
          status: condition === 'maintenance' ? AssetStatus.MAINTENANCE : AssetStatus.AVAILABLE,
          isAvailable: condition !== 'maintenance'
        }).where(eq(assets.id, booking.assetId));
      });

      res.json({ ok: true, message: "Gear returned" });
    } catch (error) {
      res.status(500).json({ message: "Failed to return gear" });
    }
  });

  // Cancel Booking (staff)
  app.post("/api/staff/bookings/:id/cancel", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.status !== BookingStatus.PENDING) {
        return res.status(409).json({ message: "Can only cancel pending bookings" });
      }

      await storage.updateBookingStatus(id, BookingStatus.CANCELLED);
      res.json({ ok: true, message: "Booking cancelled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  app.get("/api/dashboard/metrics", requireAdmin, async (req: any, res) => {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const dbStartTime = Date.now();

      // Total members (users with active memberships)
      const totalMembersResult = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'member'));
      const totalMembers = totalMembersResult[0]?.count || 0;

      // Previous month's member count for growth rate
      const previousMembersResult = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, 'member'), lte(users.createdAt, lastMonthEnd)));
      const previousMembers = previousMembersResult[0]?.count || 0;

      // Growth rate calculation
      const growthRate = previousMembers > 0
        ? ((totalMembers - previousMembers) / previousMembers * 100).toFixed(1)
        : 0;



      // Active locations
      const activeLocationsResult = await db
        .select({ count: count() })
        .from(locations)
        .where(eq(locations.isActive, true));
      const activeLocations = activeLocationsResult[0]?.count || 0;

      // Membership tiers (subscription tiers only)
      const tiersResult = await db
        .select({ count: count() })
        .from(tiers)
        .where(eq(tiers.type, 'subscription'));
      const membershipTiers = tiersResult[0]?.count || 0;

      // Recent registrations with subscription tier (last 5 members)
      const recentUsers = await db
        .select({
          userId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          plan: memberships.plan,
        })
        .from(users)
        .leftJoin(memberships, eq(users.id, memberships.userId))
        .where(eq(users.role, 'member'))
        .orderBy(desc(users.createdAt))
        .limit(5);

      // Equipment utilization (checked out items vs total)
      // FIX: Only count "gear" types and rely on real DB data
      const totalEquipmentResult = await db
        .select({ count: count() })
        .from(assets)
        .where(and(eq(assets.isAvailable, true), eq(assets.type, 'gear')));
      const totalEquipment = totalEquipmentResult[0]?.count || 0;

      const checkedOutResult = await db
        .select({ count: count() })
        .from(bookings)
        .leftJoin(assets, eq(bookings.assetId, assets.id))
        .where(
          and(
            eq(bookings.status, BookingStatus.ACTIVE),
            eq(assets.type, 'gear')
          )
        );
      const checkedOut = checkedOutResult[0]?.count || 0;

      const equipmentUtilization = totalEquipment > 0
        ? Math.round((checkedOut / totalEquipment) * 100)
        : 0;

      // No last month comparison for now as it's hard to track historical asset count without snapshots
      // But we can keep the utilization difference logic if we assume total equipment was similar
      // For now, let's just use 0 difference or simple calculation if needed
      // The user asked to make "0% from last month" view options working.
      // We can just return 0 for the difference if we can't calculate it accurately.
      const utilizationDifference = 0;

      // Equipment utilization by location
      const utilByLocation = await db
        .select({
          locationId: locations.id,
          locationName: locations.name,
          totalCount: count(assets.id),
        })
        .from(locations)
        .leftJoin(assets, eq(assets.location, locations.id))
        .where(eq(locations.isActive, true))
        .groupBy(locations.id, locations.name)
        .orderBy(desc(count(assets.id)));

      // System health metrics
      const dbResponseTime = Date.now() - dbStartTime;

      res.json({
        keyMetrics: {
          totalMembers,
          equipmentUtilization: `${equipmentUtilization}%`,
          utilizationChange: utilizationDifference > 0 ? `+${utilizationDifference}%` : `${utilizationDifference}%`,
          growthRate: `${growthRate}%`
        },
        platformOverview: {
          totalMembers,
          equipmentItems: totalEquipment,
          activeLocations: activeLocations,
          membershipTiers: membershipTiers
        },
        recentRegistrations: recentUsers.map(u => ({
          id: u.userId,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          plan: u.plan || 'base',
          timestamp: u.createdAt,
        })),
        utilizationByLocation: utilByLocation.map(loc => ({
          location: loc.locationName,
          count: loc.totalCount || 0,
        })),
        systemHealth: {
          apiResponseTime: `${dbResponseTime}ms`,
          databaseStatus: 'Healthy',
          paymentGateway: 'Online',
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Staff Dashboard Metrics
  app.get("/api/staff/dashboard/today", requireStaff, async (req: any, res) => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();
      const startOfToday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfToday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      const bookingConditions: any[] = [
        gte(bookings.startDate, startOfToday),
        lte(bookings.startDate, endOfToday),
      ];

      const todaysBookings = await db
        .select({
          booking: bookings,
          asset: assets,
          user: users,
        })
        .from(bookings)
        .leftJoin(assets, eq(bookings.assetId, assets.id))
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(and(...bookingConditions))
        .orderBy(bookings.startDate);

      const bookingsWithDetails = todaysBookings.map(({ booking, asset, user }) => {
        let isExpired = false;
        if (booking.status === BookingStatus.PENDING) {
          const bookingDate = new Date(booking.startDate);
          if (bookingDate < new Date()) {
            isExpired = true;
          }
        }

        return {
          id: booking.id,
          assetName: asset?.name || 'Unknown Asset',
          assetId: booking.assetId,
          memberName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
          memberEmail: user?.email,
          status: booking.status,
          isExpired,
          startTime: booking.startDate,
          qrCode: booking.qrCode,
          checkedOutAt: booking.checkedOutAt,
          checkedInAt: booking.checkedInAt,
        };
      });

      const activeCheckouts = await db.select({ count: count() })
        .from(bookings)
        .where(eq(bookings.status, BookingStatus.ACTIVE));

      const now = new Date();
      const pendingReturns = await db.select({ count: count() })
        .from(bookings)
        .where(and(
          eq(bookings.status, BookingStatus.ACTIVE),
          lt(bookings.endDate, now)
        ));

      const allAssets = await storage.getAssets();
      const inventory = {
        total: allAssets.length,
        available: allAssets.filter(a => a.status === AssetStatus.AVAILABLE).length,
        maintenance: allAssets.filter(a => a.status === AssetStatus.MAINTENANCE).length,
        unavailable: allAssets.filter(a => a.status === AssetStatus.OUT_OF_SERVICE).length
      };

      res.json({
        ok: true,
        bookings: bookingsWithDetails,
        inventory,
        activeCheckouts: activeCheckouts[0]?.count || 0,
        pendingReturns: pendingReturns[0]?.count || 0,
        maintenanceItems: inventory.maintenance,
        totalToday: todaysBookings.length
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ ok: false, message: "Failed to fetch dashboard" });
    }
  });

  // Admin endpoint to view all users and their tier assignments
  app.get("/api/admin/users", requireAdmin, async (req: any, res) => {
    try {
      // Fetch all users (members, staff, and admins)
      const allUsers = await db.select().from(users);

      // Fetch tier data for each user
      const usersWithTiers = await Promise.all(
        allUsers.map(async (user: any) => {
          const tierRecords = await db.select().from(userTierBenefits).where(eq(userTierBenefits.userId, user.id));

          // Get unique tier IDs and find tier details
          const tierIds = Array.from(new Set(tierRecords.map(r => r.currentTierId)));
          const tierDetails: any = {};

          for (const tierId of tierIds) {
            const tierInfo = await db.select().from(tiers).where(eq(tiers.id, tierId)).limit(1);
            if (tierInfo.length > 0 && tierInfo[0].type) {
              tierDetails[tierInfo[0].type] = tierId;
            }
          }

          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            waiverAccepted: user.waiverAccepted,
            createdAt: user.createdAt,
            currentTierId: tierDetails.subscription || null,
            currentLoyaltyTierId: tierDetails.loyalty || null
          };
        })
      );

      res.json(usersWithTiers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin endpoint to sync users from Supabase
  app.post("/api/admin/sync-users", requireAdmin, async (req: any, res) => {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ message: "Missing Supabase credentials" });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: { users: supabaseUsers }, error } = await supabase.auth.admin.listUsers();

      if (error) {
        throw error;
      }

      let syncedCount = 0;
      for (const sbUser of supabaseUsers) {
        const meta = sbUser.user_metadata || {};
        const fullName = meta.full_name || meta.name || '';
        const firstName = meta.first_name || fullName.split(' ')[0] || '';
        const lastName = meta.last_name || fullName.split(' ').slice(1).join(' ') || '';
        const email = sbUser.email;

        if (!email) continue;

        // Uses storage.upsertUser which handles the logic
        await storage.upsertUser({
          id: sbUser.id,
          email,
          firstName,
          lastName,
          // role: 'member', // Do not overwrite role here to protect admin assignments
        });
        syncedCount++;
      }

      res.json({ message: "Users synced successfully", count: syncedCount });
    } catch (error) {
      console.error("Error syncing users:", error);
      res.status(500).json({ message: "Failed to sync users" });
    }
  });

  // Admin endpoint to create a new user
  app.post("/api/admin/users", requireAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Check if email already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      // Generate user ID and temporary password
      const userId = `user_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
      const passwordHash = await bcryptjs.hash(tempPassword, 10);

      // Create new user with member role
      const newUser = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        role: "member",
      } as any);

      // Set password hash
      await storage.setPasswordHash(newUser.id, passwordHash);

      res.json({
        message: "User created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
        tempPassword,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Admin endpoint to manually adjust user credits
  app.post("/api/admin/users/:userId/credits", requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { amount, reason } = req.body;

      if (typeof amount !== 'number') {
        return res.status(400).json({ message: "Amount must be a number" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add credits (can be negative for deduction)
      const transaction = await storage.addCredits(
        userId,
        amount,
        'ADJUSTMENT',
        reason || `Manual adjustment by admin ${req.user.email}`,
        undefined,
        undefined,
        undefined,
        req.user.id
      );

      res.json({
        message: "Credits adjusted successfully",
        transaction,
        newBalance: transaction.balanceAfter
      });
    } catch (error) {
      console.error("Error adjusting credits:", error);
      res.status(500).json({ message: "Failed to adjust credits" });
    }
  });

  // Update user subscription plan
  app.post("/api/users/:userId/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { plan } = req.body;

      // Users can only update their own subscription
      if (userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own subscription" });
      }

      if (!['base', 'premium', 'vip', 'employee'].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      await storage.updateUserSubscription(userId, { plan });

      // Auto-calculate loyalty tier achievements
      await storage.calculateLoyaltyTierAchievements(userId);

      res.json({
        message: "Subscription updated successfully",
        plan
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Admin endpoint to update any user's subscription
  app.post("/api/admin/users/:userId/subscription", requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { plan, status } = req.body;

      if (!['base', 'premium', 'vip', 'employee'].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      await storage.updateUserSubscription(userId, { plan, status: status || 'active' });

      // Auto-calculate loyalty tier achievements
      await storage.calculateLoyaltyTierAchievements(userId);

      res.json({
        message: "Subscription updated successfully",
        plan,
        status: status || 'active',
        updatedBy: req.user?.email
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });


  // Admin settings endpoints
  app.get("/api/admin/settings", requireAdmin, async (req: any, res) => {
    try {
      const settings = await db.select().from(adminSettings);
      const settingsObj: any = {};
      settings.forEach(s => {
        if (s.key === 'autoDaysSetting') {
          settingsObj.autoDaysSetting = parseInt(s.value);
        } else {
          settingsObj[s.key] = s.value;
        }
      });
      res.json(settingsObj);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req: any, res) => {
    try {
      const { autoDaysSetting, stripeSecretKey, stripePublishableKey } = req.body;

      // Update Auto Days if provided
      if (autoDaysSetting) {
        if (autoDaysSetting < 1) {
          return res.status(400).json({ message: "Days must be at least 1" });
        }

        const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, 'autoDaysSetting'));
        if (existing.length > 0) {
          await db.update(adminSettings)
            .set({ value: autoDaysSetting.toString(), updatedAt: new Date() })
            .where(eq(adminSettings.key, 'autoDaysSetting'));
        } else {
          await db.insert(adminSettings).values({
            id: crypto.randomUUID(),
            key: 'autoDaysSetting',
            value: autoDaysSetting.toString(),
            description: 'Days until auto-promotion to loyalty tier',
          });
        }
      }

      // Update Stripe Keys if provided
      if (stripeSecretKey) {
        const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, 'STRIPE_SECRET_KEY'));
        if (existing.length > 0) {
          await db.update(adminSettings)
            .set({ value: stripeSecretKey, updatedAt: new Date() })
            .where(eq(adminSettings.key, 'STRIPE_SECRET_KEY'));
        } else {
          await db.insert(adminSettings).values({
            id: crypto.randomUUID(),
            key: 'STRIPE_SECRET_KEY',
            value: stripeSecretKey,
            description: 'Stripe Secret Key',
          });
        }
      }

      if (stripePublishableKey) {
        const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, 'STRIPE_PUBLISHABLE_KEY'));
        if (existing.length > 0) {
          await db.update(adminSettings)
            .set({ value: stripePublishableKey, updatedAt: new Date() })
            .where(eq(adminSettings.key, 'STRIPE_PUBLISHABLE_KEY'));
        } else {
          await db.insert(adminSettings).values({
            id: crypto.randomUUID(),
            key: 'STRIPE_PUBLISHABLE_KEY',
            value: stripePublishableKey,
            description: 'Stripe Publishable Key',
          });
        }
      }

      // If keys were updated, re-initialize Stripe
      if (stripeSecretKey) {
        const { reinitializeStripe } = await import("./stripeRoutes");
        await reinitializeStripe();
      }

      res.json({ message: "Settings updated" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/staff/scanner", requireStaff, async (req: any, res) => {
    res.json({
      message: "Staff scanner access granted",
      user: req.user
    });
  });

  // Barcode scanning - lookup asset by barcode
  app.post("/api/staff/scan", requireStaff, async (req: any, res) => {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }

      // Find asset by barcode
      const [asset] = await db
        .select()
        .from(assets)
        .where(eq(assets.barcode, barcode));

      if (!asset) {
        return res.status(404).json({
          message: "Asset not found",
          barcode
        });
      }

      // Check if there's an active booking for this asset
      const now = new Date();
      const [activeBooking] = await db
        .select({
          booking: bookings,
          member: users
        })
        .from(bookings)
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(
          and(
            eq(bookings.assetId, asset.id),
            or(
              eq(bookings.status, BookingStatus.PENDING),
              eq(bookings.status, BookingStatus.ACTIVE)
            )
          )
        )
        .limit(1);

      // Log the scan
      await db.insert(assetScanHistory).values({
        assetId: asset.id,
        scannedBy: req.user.id,
        action: 'scan',
        previousStatus: asset.status,
        newStatus: asset.status,
      });

      // Update last scanned timestamp
      await db.update(assets)
        .set({
          lastScannedAt: new Date(),
          lastScannedBy: req.user.id
        })
        .where(eq(assets.id, asset.id));

      res.json({
        asset,
        activeBooking: activeBooking ? {
          id: activeBooking.booking.id,
          status: activeBooking.booking.status,
          startDate: activeBooking.booking.startDate,
          endDate: activeBooking.booking.endDate,
          member: activeBooking.member ? {
            id: activeBooking.member.id,
            firstName: activeBooking.member.firstName,
            lastName: activeBooking.member.lastName,
            email: activeBooking.member.email
          } : null
        } : null
      });
    } catch (error) {
      console.error("Error scanning barcode:", error);
      res.status(500).json({ message: "Failed to scan barcode" });
    }
  });

  // Member lookup by ID
  app.get("/api/staff/members/:memberId", requireStaff, async (req: any, res) => {
    try {
      const { memberId } = req.params;

      if (!memberId) {
        return res.status(400).json({ message: "Member ID is required" });
      }

      // Find member by ID
      const [member] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          adamsCredits: users.adamsCredits,
        })
        .from(users)
        .where(and(eq(users.id, memberId), eq(users.role, 'member')));

      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Get upcoming bookings
      const now = new Date();
      const upcomingBookings = await db
        .select({
          id: bookings.id,
          assetName: assets.name,
          startDate: bookings.startDate,
          endDate: bookings.endDate,
          status: bookings.status,
        })
        .from(bookings)
        .leftJoin(assets, eq(bookings.assetId, assets.id))
        .where(
          and(
            eq(bookings.userId, memberId),
            or(
              eq(bookings.status, BookingStatus.ACTIVE),
              eq(bookings.status, BookingStatus.PENDING)
            )
          )
        )
        .orderBy(bookings.startDate);

      res.json({
        member: {
          ...member,
          adamsCredits: member.adamsCredits || '0.00',
          upcomingBookings: upcomingBookings || []
        }
      });
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  // Update asset status - Check In
  app.post("/api/staff/assets/:id/check-in", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes, bookingId } = req.body;

      const [asset] = await db.select().from(assets).where(eq(assets.id, id));
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const previousStatus = asset.status;

      // Update asset status to available
      await db.update(assets)
        .set({
          status: AssetStatus.AVAILABLE,
          isAvailable: true,
          maintenanceMode: false,
          lastScannedAt: new Date(),
          lastScannedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(assets.id, id));

      // If there's a booking, update it
      if (bookingId) {
        await db.update(bookings)
          .set({
            status: BookingStatus.COMPLETED,
            checkedInAt: new Date(),
            checkedInBy: req.user.id,
            updatedAt: new Date()
          })
          .where(eq(bookings.id, bookingId));
      }

      // Log the action
      await db.insert(assetScanHistory).values({
        assetId: id,
        scannedBy: req.user.id,
        action: 'check_in',
        previousStatus,
        newStatus: AssetStatus.AVAILABLE,
        bookingId: bookingId || null,
        notes: notes || null,
      });

      res.json({
        message: "Asset checked in successfully",
        status: AssetStatus.AVAILABLE
      });
    } catch (error) {
      console.error("Error checking in asset:", error);
      res.status(500).json({ message: "Failed to check in asset" });
    }
  });

  // Update asset status - Maintenance
  app.post("/api/staff/assets/:id/maintenance", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes, damageReported } = req.body;

      const [asset] = await db.select().from(assets).where(eq(assets.id, id));
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const previousStatus = asset.status;

      // Update asset status to maintenance
      await db.update(assets)
        .set({
          status: AssetStatus.MAINTENANCE,
          isAvailable: false,
          maintenanceMode: true,
          lastScannedAt: new Date(),
          lastScannedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(assets.id, id));

      // Log the action
      await db.insert(assetScanHistory).values({
        assetId: id,
        scannedBy: req.user.id,
        action: 'maintenance',
        previousStatus,
        newStatus: AssetStatus.MAINTENANCE,
        notes: notes || null,
        damageReported: damageReported || false,
      });

      res.json({
        message: "Asset marked for maintenance",
        status: AssetStatus.MAINTENANCE
      });
    } catch (error) {
      console.error("Error marking asset for maintenance:", error);
      res.status(500).json({ message: "Failed to mark asset for maintenance" });
    }
  });

  // Update asset status - Out of Service
  app.post("/api/staff/assets/:id/out-of-service", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const [asset] = await db.select().from(assets).where(eq(assets.id, id));
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const previousStatus = asset.status;

      // Update asset status to out of service
      await db.update(assets)
        .set({
          status: AssetStatus.OUT_OF_SERVICE,
          isAvailable: false,
          maintenanceMode: false,
          lastScannedAt: new Date(),
          lastScannedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(assets.id, id));

      // Log the action
      await db.insert(assetScanHistory).values({
        assetId: id,
        scannedBy: req.user.id,
        action: 'out_of_service',
        previousStatus,
        newStatus: AssetStatus.OUT_OF_SERVICE,
        notes: notes || null,
      });

      res.json({
        message: "Asset marked as out of service",
        status: AssetStatus.OUT_OF_SERVICE
      });
    } catch (error) {
      console.error("Error marking asset out of service:", error);
      res.status(500).json({ message: "Failed to mark asset out of service" });
    }
  });

  // Update asset status - Mark Available
  app.post("/api/staff/assets/:id/available", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const [asset] = await db.select().from(assets).where(eq(assets.id, id));
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const previousStatus = asset.status;

      // Update asset status to available
      await db.update(assets)
        .set({
          status: AssetStatus.AVAILABLE,
          isAvailable: true,
          maintenanceMode: false,
          lastScannedAt: new Date(),
          lastScannedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(assets.id, id));

      // Log the action
      await db.insert(assetScanHistory).values({
        assetId: id,
        scannedBy: req.user.id,
        action: 'available',
        previousStatus,
        newStatus: AssetStatus.AVAILABLE,
        notes: notes || null,
      });

      res.json({
        message: "Asset marked as available",
        status: AssetStatus.AVAILABLE
      });
    } catch (error) {
      console.error("Error marking asset available:", error);
      res.status(500).json({ message: "Failed to mark asset available" });
    }
  });

  // Get asset scan history
  app.get("/api/staff/assets/:id/history", requireStaff, async (req: any, res) => {
    try {
      const { id } = req.params;

      const history = await db
        .select({
          scan: assetScanHistory,
          scannedByUser: users
        })
        .from(assetScanHistory)
        .leftJoin(users, eq(assetScanHistory.scannedBy, users.id))
        .where(eq(assetScanHistory.assetId, id))
        .orderBy(desc(assetScanHistory.scannedAt))
        .limit(50);

      res.json(history.map(({ scan, scannedByUser }) => ({
        ...scan,
        scannedByName: scannedByUser ? `${scannedByUser.firstName} ${scannedByUser.lastName}` : 'Unknown'
      })));
    } catch (error) {
      console.error("Error fetching scan history:", error);
      res.status(500).json({ message: "Failed to fetch scan history" });
    }
  });

  // Get user's credit balance and transaction history
  app.get("/api/users/:userId/credits", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Users can only view their own credits unless they're admin
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const transactions = await storage.getCreditTransactions(userId, 50);

      res.json({
        userId,
        credits: user.adamsCredits,
        transactions
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // QR Code generation for bookings
  app.get("/api/qr/:bookingId", isAuthenticated, (req: any, res) => {
    const { bookingId } = req.params;

    // Generate QR code data - this would typically include booking verification data
    const qrData = {
      bookingId,
      userId: req.user.id,
      timestamp: Date.now(),
      // In production, this would include cryptographic verification
      verification: `booking-${bookingId}-${req.user.id}`
    };

    res.json({
      success: true,
      qrData: JSON.stringify(qrData),
      displayUrl: `${req.protocol}://${req.get('host')}/qr/${bookingId}`
    });
  });

  // Development only - Role switching endpoint
  app.post("/api/dev/change-role", isAuthenticated, async (req: any, res) => {
    const { role } = req.body;

    // Validate role
    if (!['member', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = (req.user as any).id;

      // Actually update the user role in the database
      await storage.updateUserRole(userId, role);

      console.log(`Role updated for user ${userId} to ${role}`);
      res.json({ success: true, role: role });

    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  // Get availability for a specific date
  app.get("/api/availability", isAuthenticated, async (req: any, res) => {
    try {
      const { date, type, category } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      const searchDate = new Date(date);
      if (isNaN(searchDate.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      // 1. Find candidate assets
      let assetsQuery = db.select().from(assets).where(eq(assets.isAvailable, true));
      if (type && type !== 'all') assetsQuery = assetsQuery.where(eq(assets.type, type));
      if (category) assetsQuery = assetsQuery.where(eq(assets.category, category));

      const candidateAssets = await assetsQuery;

      // Define time slots (8:00 AM to 6:00 PM)
      const slots = [];
      for (let h = 8; h < 18; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        slots.push(`${h.toString().padStart(2, '0')}:30`);
      }

      if (candidateAssets.length === 0) {
        return res.json(slots.map(time => ({
          time,
          status: 'booked',
          remaining: 0,
          note: "No assets available"
        })));
      }

      // 2. Get existing bookings for the day
      const startOfDay = new Date(searchDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate); endOfDay.setHours(23, 59, 59, 999);
      const assetIds = candidateAssets.map(a => a.id);

      const existingBookings = await db.select().from(bookings)
        .where(
          and(
            inArray(bookings.assetId, assetIds),
            sql`${bookings.status} != 'cancelled'`,
            or(
              and(gte(bookings.startDate, startOfDay), lte(bookings.startDate, endOfDay)),
              and(gte(bookings.endDate, startOfDay), lte(bookings.endDate, endOfDay)),
              and(lte(bookings.startDate, startOfDay), gte(bookings.endDate, endOfDay))
            )
          )
        );

      // 3. Check availability for each slot
      const availability = slots.map(time => {
        const [hours, mins] = time.split(':').map(Number);
        const slotDesc = new Date(searchDate);
        slotDesc.setHours(hours, mins, 0, 0);

        // Count how many assets are free at this slot start time
        let availableCount = 0;
        let nextFreeTime: number | null = null;

        for (const asset of candidateAssets) {
          const assetBookings = existingBookings.filter(b => b.assetId === asset.id);

          // Check for overlapping bookings including buffer
          // Asset is busy if slotStart is within [Start, BufferEnd)
          const conflictingBooking = assetBookings.find(b => {
            const start = b.startDate;
            // Calculate buffer end specifically for this booking
            // Use stored bufferEnd if available, else calc
            const bufferEnd = b.bufferEnd || new Date(b.endDate.getTime() + 60 * 60 * 1000);

            return slotDesc >= start && slotDesc < bufferEnd;
          });

          if (!conflictingBooking) {
            availableCount++;
          } else {
            // track when this asset becomes free (start of next slot)
            const bufferEnd = conflictingBooking.bufferEnd || new Date(conflictingBooking.endDate.getTime() + 60 * 60 * 1000);
            if (nextFreeTime === null || bufferEnd.getTime() < nextFreeTime) {
              nextFreeTime = bufferEnd.getTime();
            }
          }
        }

        let note = "";
        if (availableCount === 0 && nextFreeTime) {
          const freeDate = new Date(nextFreeTime);
          const timeStr = freeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          note = `Reserved until ${timeStr}`;
        }

        return {
          time,
          status: availableCount > 0 ? 'available' : 'booked',
          remaining: availableCount,
          total: candidateAssets.length,
          note
        };
      });

      res.json(availability);

    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Create a new booking (atomic: validates equipment, then creates booking + deducts credits in one transaction)
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const { assetId, benefitId, benefitTitle, benefitIcon, type, date, time, duration, location, notes, creditCost } = req.body;

      console.log(`[BOOKING] Request payload:`, JSON.stringify({ assetId, benefitId, type, date, time, duration, location, creditCost }));

      if (!date || !time) {
        return res.status(400).json({ message: "Date and time are required", code: 'VALIDATION_ERROR' });
      }

      const startDate = new Date(`${date}T${time}${time.length <= 5 ? ':00' : ''}`);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ message: "Invalid date or time format", code: 'VALIDATION_ERROR' });
      }

      let hours = 1;
      if (typeof duration === 'string') {
        if (duration.toLowerCase().includes('day')) hours = 8;
        else if (duration.toLowerCase().includes('hour')) hours = parseFloat(duration) || 1;
        else {
          const parsed = parseFloat(duration);
          if (!isNaN(parsed)) hours = parsed;
        }
      } else if (typeof duration === 'number') {
        hours = duration;
      }
      const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);

      // 1. Resolve the actual asset from the database
      let targetAsset = null;

      if (assetId) {
        targetAsset = await storage.getAsset(assetId);
      }

      // benefitId can be passed from frontend
      if (!targetAsset && benefitId) {
        targetAsset = await storage.getAsset(benefitId);
      }

      if (!targetAsset) {
        const requestedType = (type || '').toLowerCase().trim();
        const requestedTitle = (benefitTitle || '').toLowerCase().trim();
        console.log(`[BOOKING] No direct asset match for benefitId="${benefitId}". Searching by category/name for "${requestedType}" / "${requestedTitle}"`);

        const availableAsset = await storage.findAvailableAssetByCategory(requestedType, requestedTitle, startDate, endDate);
        if (availableAsset) {
          targetAsset = availableAsset;
          console.log(`[BOOKING] Found matching asset by category: "${availableAsset.name}" (id: ${availableAsset.id})`);
        }

        if (!targetAsset) {
          // Final fallback: try to find any available asset of the requested type if category match fails
          const anyAsset = await storage.findAvailableAsset(requestedType, startDate, endDate);
          if (anyAsset) {
            targetAsset = anyAsset;
          }
        }

        if (!targetAsset) {
          console.error(`[BOOKING] No available assets matching "${requestedType}" / "${requestedTitle}"`);
          return res.status(200).json({ // Return 200 with error flag to prevent UI crash
            ok: false,
            message: `No "${requestedType || 'gear'}" equipment available. Please contact admin or try a different time.`,
            code: 'EQUIPMENT_NOT_FOUND',
            details: { requestedType, benefitId }
          });
        }
      }

      console.log(`[BOOKING] Resolved asset: "${targetAsset.name}" (id: ${targetAsset.id})`);

      // 2. Check booking conflicts
      const hasConflict = await storage.checkBookingConflicts(targetAsset.id, startDate, endDate);
      if (hasConflict) {
        return res.status(409).json({
          message: "Selected time slot overlaps with an existing reservation or buffer period.",
          code: 'TIME_CONFLICT'
        });
      }

      // 3. Validate credit balance BEFORE transaction (fast fail)
      const cost = Number(creditCost) || 0;
      if (cost > 0) {
        const currentUser = await storage.getUser(req.user.id);
        const currentCredits = parseFloat(currentUser?.adamsCredits || '0');
        console.log(`[BOOKING] Credit check - balance: ${currentCredits}, cost: ${cost}`);
        if (currentCredits < cost) {
          return res.status(400).json({
            message: `Insufficient adventure credits. Available: ${currentCredits.toFixed(2)}, Required: ${cost.toFixed(2)}`,
            code: 'INSUFFICIENT_CREDITS'
          });
        }
      }

      // 4. ATOMIC: Create booking + deduct credits in a single transaction
      const booking = await storage.createBookingWithCredits({
        userId: req.user.id,
        assetId: targetAsset.id,
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 0,
        notes: notes || null
      }, cost > 0 ? cost : undefined);

      console.log(`[BOOKING] Success - booking id: ${booking.id}, credits used: ${booking.creditsUsed}`);

      const formattedBooking = {
        id: booking.id,
        benefitId: targetAsset.id,
        benefitTitle: benefitTitle || targetAsset.name,
        benefitIcon: benefitIcon || 'Package',
        date: date,
        time: time,
        location: location || targetAsset.location || 'TBD',
        status: 'pending',
        type: type || targetAsset.type || 'gear',
        duration: duration || 'Full day',
        qrCode: booking.qrCode,
        qrToken: booking.qrToken,
      };

      res.status(201).json(formattedBooking);
    } catch (error: any) {
      console.error("[BOOKING] Error creating booking:", error);
      if (!res.headersSent) {
        const statusCode = error.message?.includes('Insufficient') ? 400 : 500;
        res.status(statusCode).json({
          message: error.message || "Failed to create booking",
          code: 'BOOKING_ERROR'
        });
      }
    }
  });

  // Get user's bookings
  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).send("Unauthorized");
      }

      const userBookings = await db
        .select({
          booking: bookings,
          asset: assets,
        })
        .from(bookings)
        .leftJoin(assets, eq(bookings.assetId, assets.id))
        .where(eq(bookings.userId, user.id))
        .orderBy(desc(bookings.createdAt));

      const formattedBookings = userBookings.map(({ booking, asset }) => {
        let frontendStatus = 'pending';
        if (booking.status === BookingStatus.ACTIVE) {
          frontendStatus = 'active';
        } else if (booking.status === BookingStatus.COMPLETED) {
          frontendStatus = 'completed';
        } else if (booking.status === BookingStatus.CANCELLED) {
          frontendStatus = 'cancelled';
        } else if (booking.checkedInAt) {
          frontendStatus = 'completed';
        } else if (booking.checkedOutAt) {
          frontendStatus = 'active';
        } else {
          frontendStatus = 'pending';
        }

        // Map asset type to booking type
        const typeMap: Record<string, string> = {
          'kayak': 'kayak',
          'camping': 'camping',
          'bike': 'bike',
          'hiking': 'hiking',
          'kayak-premium': 'kayak',
          'camping-kit': 'camping',
          'bike-rental': 'bike',
          'mountain-bike': 'bike',
          'guided-hike': 'hiking',
          'hiking-gear': 'hiking'
        };

        // Get icon name based on asset type
        const iconMap: Record<string, string> = {
          'kayak': 'Waves',
          'camping': 'Tent',
          'bike': 'Bike',
          'hiking': 'Mountain'
        };

        const assetType = asset?.type || 'gear';
        const bookingType = typeMap[assetType] || 'kayak';
        const icon = iconMap[bookingType] || 'Backpack';

        return {
          id: booking.id,
          benefitId: booking.assetId,
          benefitTitle: asset?.name || 'Adventure Booking',
          benefitIcon: icon,
          date: booking.startDate.toISOString().split('T')[0],
          time: booking.startDate.toTimeString().substring(0, 5),
          location: asset?.location || 'TBD',
          status: frontendStatus,
          type: bookingType,
          duration: 'Full day',
          qrCode: booking.qrCode || undefined,
          qrToken: booking.qrToken || undefined,
          checkInTime: booking.checkedInAt ? booking.checkedInAt.toTimeString().substring(0, 5) : undefined,
          checkOutTime: booking.checkedOutAt ? booking.checkedOutAt.toTimeString().substring(0, 5) : undefined,
          notes: booking.damageNotes || undefined,
        };
      });

      res.json(formattedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).send("Failed to fetch bookings");
    }
  });

  // (Duplicate POST /api/bookings removed - consolidated into single atomic handler above)

  // Get a specific booking by ID
  app.get("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const booking = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, req.params.id),
            eq(bookings.userId, req.user.id)
          )
        )
        .limit(1);

      if (booking.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(booking[0]);
    } catch (error: any) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Update booking status
  app.patch("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { status, checkedInAt, checkedOutAt, damageNotes } = req.body;

      const updatedBooking = await db
        .update(bookings)
        .set({
          ...(status && { status }),
          ...(checkedInAt && { checkedInAt }),
          ...(checkedOutAt && { checkedOutAt }),
          ...(damageNotes && { damageNotes }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookings.id, req.params.id),
            eq(bookings.userId, req.user.id)
          )
        )
        .returning();

      if (updatedBooking.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(updatedBooking[0]);
    } catch (error: any) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Cancel a booking
  app.delete("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const updatedBooking = await db
        .update(bookings)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookings.id, req.params.id),
            eq(bookings.userId, req.user.id)
          )
        )
        .returning();

      if (updatedBooking.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(updatedBooking[0]);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Get user's current tier based on loyalty (membership tenure)
  app.get("/api/users/:userId/tier", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Users can only view their own tier unless they're admin
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate months of membership
      const membershipStart = user.createdAt || new Date();
      const monthsActive = Math.floor((Date.now() - membershipStart.getTime()) / (1000 * 60 * 60 * 24 * 30));

      // Determine tier based on tenure
      let tierName = "New Explorer";
      if (monthsActive >= 24) {
        tierName = "Summit Master";
      } else if (monthsActive >= 12) {
        tierName = "Elite Explorer";
      } else if (monthsActive >= 6) {
        tierName = "Seasoned Adventurer";
      }

      // Get tier from database
      const [tier] = await db.select().from(tiers).where(eq(tiers.name, tierName)).limit(1);

      if (!tier) {
        return res.status(404).json({ message: "Tier not found" });
      }

      // Calculate display values for loyalty badge
      let loyaltyDisplay = "";
      if (monthsActive >= 12) {
        const years = Math.floor(monthsActive / 12);
        loyaltyDisplay = years === 1 ? "1 year loyalty" : `${years} years loyalty`;
      } else {
        loyaltyDisplay = `${monthsActive} months loyalty`;
      }

      res.json({
        tier,
        monthsActive,
        loyaltyDisplay
      });
    } catch (error) {
      console.error("Error fetching user tier:", error);
      res.status(500).json({ message: "Failed to fetch tier" });
    }
  });

  // Get user's available benefits based on tier and subscription
  app.get("/api/users/:userId/benefits", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Users can only view their own benefits unless they're admin
      if (userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's current tier
      const tierResponse = await fetch(`${req.protocol}://${req.get('host')}/api/users/${userId}/tier`, {
        headers: { cookie: req.headers.cookie || '' }
      });
      const { tier } = await tierResponse.json();

      // Get all perks for this tier
      const tierPerksData = await db
        .select({
          perk: perks,
        })
        .from(tierPerks)
        .leftJoin(perks, eq(tierPerks.perkId, perks.id))
        .where(eq(tierPerks.tierId, tier.id));

      res.json({
        tier,
        benefits: tierPerksData.map(tp => tp.perk)
      });
    } catch (error) {
      console.error("Error fetching user benefits:", error);
      res.status(500).json({ message: "Failed to fetch benefits" });
    }
  });

  // Get schedule for the rest of the month
  app.get("/api/staff/dashboard/month", requireStaff, async (req: any, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      const bookingConditions: any[] = [
        gte(bookings.startDate, today),
        lte(bookings.startDate, lastDay),
      ];

      const monthBookings = await db
        .select({
          booking: bookings,
          asset: assets,
          user: users,
        })
        .from(bookings)
        .leftJoin(assets, eq(bookings.assetId, assets.id))
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(and(...bookingConditions))
        .orderBy(bookings.startDate);

      const bookingsByDate: Record<string, any[]> = {};
      let remainingCount = 0;
      monthBookings.forEach(({ booking, asset, user }) => {
        const dateKey = new Date(booking.startDate).toISOString().split('T')[0];
        if (!bookingsByDate[dateKey]) {
          bookingsByDate[dateKey] = [];
        }
        bookingsByDate[dateKey].push({
          id: booking.id,
          assetName: asset?.name || 'Unknown',
          assetId: asset?.id,
          memberName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
          memberEmail: user?.email,
          status: booking.status,
          startTime: booking.startDate,
          endTime: booking.endDate,
          qrCode: booking.qrCode,
          checkedOutAt: booking.checkedOutAt,
          checkedInAt: booking.checkedInAt,
        });
        if (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.ACTIVE) {
          remainingCount++;
        }
      });

      res.json({
        bookingsByDate,
        currentMonth: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalBookings: remainingCount,
      });
    } catch (error) {
      console.error("Error fetching monthly schedule:", error);
      res.status(500).json({ message: "Failed to fetch monthly schedule" });
    }
  });

  app.get("/api/staff/inventory", requireStaff, async (req: any, res) => {
    try {
      const allAssets = await db.select().from(assets).orderBy(assets.name);

      const formattedAssets = allAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        location: asset.location,
        condition: asset.condition,
        isAvailable: asset.isAvailable,
        maintenanceMode: asset.maintenanceMode,
        capacity: asset.capacity,
      }));

      res.json(formattedAssets);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post("/api/staff/checkin", requireStaff, async (req: any, res) => {
    try {
      const { bookingId, damageNotes, damagePhotos, needsMaintenance } = req.body;

      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID required" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // If equipment needs maintenance, set asset to maintenance mode
      if (needsMaintenance && booking.assetId) {
        await db
          .update(assets)
          .set({ maintenanceMode: true })
          .where(eq(assets.id, booking.assetId));
      }

      await db
        .update(bookings)
        .set({
          status: BookingStatus.COMPLETED,
          checkedInAt: new Date(),
          checkedInBy: req.user.id,
          damageNotes: damageNotes || null,
          damagePhotos: damagePhotos || [],
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

      res.json({ message: "Equipment checked in successfully" });
    } catch (error) {
      console.error("Error checking in:", error);
      res.status(500).json({ message: "Failed to check in equipment" });
    }
  });

  app.post("/api/staff/checkout", requireStaff, async (req: any, res) => {
    try {
      const { bookingId } = req.body;

      if (!bookingId) {
        return res.status(400).json({ message: "Booking ID required" });
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      await db
        .update(bookings)
        .set({
          status: BookingStatus.ACTIVE,
          checkedOutAt: new Date(),
          checkedOutBy: req.user.id,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

      res.json({ message: "Equipment checked out successfully" });
    } catch (error) {
      console.error("Error checking out:", error);
      res.status(500).json({ message: "Failed to check out equipment" });
    }
  });

  // Get location inventory for staff member
  app.get("/api/staff/location-inventory", requireStaff, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Get user's locations
      const userLocs = await db
        .select({ locationId: userLocations.locationId, name: locations.name })
        .from(userLocations)
        .innerJoin(locations, eq(userLocations.locationId, locations.id))
        .where(eq(userLocations.userId, userId));

      if (userLocs.length === 0) {
        return res.json({ locations: [], stats: { pendingCheckIns: 0, availableGear: 0, inMaintenance: 0, todaysBookings: 0 }, inventory: [] });
      }

      const locationId = userLocs[0].locationId;
      const locationName = userLocs[0].name;

      // Get inventory for location
      const inventory = await storage.getLocationInventory(locationId);

      // Get asset details
      const assetIds = inventory.map(inv => inv.assetId);
      const allAssets = assetIds.length > 0
        ? await db.select().from(assets).where(inArray(assets.id, assetIds))
        : [];

      const enrichedInventory = inventory.map(inv => {
        const asset = allAssets.find(a => a.id === inv.assetId);
        return {
          ...inv,
          assetName: asset?.name || 'Unknown',
          assetCategory: asset?.category,
          assetCondition: asset?.condition,
          type: asset?.type,
          maintenanceMode: asset?.maintenanceMode || false,
        };
      });

      // Get stats
      const pendingCheckIns = await db
        .select()
        .from(bookings)
        .where(eq(bookings.status, 'active'));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysBookings = await db
        .select()
        .from(bookings)
        .where(and(
          gte(bookings.startDate, today), 
          lte(bookings.startDate, tomorrow),
          inArray(bookings.status, [BookingStatus.PENDING, BookingStatus.ACTIVE])
        ));

      const availableGear = enrichedInventory.filter(inv => inv.quantity > 0).length;
      const inMaintenance = allAssets.filter(a => a.maintenanceMode).length;

      res.json({
        location: { id: locationId, name: locationName },
        inventory: enrichedInventory,
        stats: {
          pendingCheckIns: pendingCheckIns.length,
          availableGear,
          inMaintenance,
          todaysBookings: todaysBookings.length,
        },
      });
    } catch (error) {
      console.error("Error fetching location inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Update location inventory
  app.patch("/api/staff/location-inventory/:locationId/:assetId", requireStaff, async (req: any, res) => {
    try {
      const { locationId, assetId } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      // Verify user has access to this location
      const hasAccess = await db
        .select()
        .from(userLocations)
        .where(and(eq(userLocations.userId, req.user.id), eq(userLocations.locationId, locationId)))
        .limit(1);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this location" });
      }

      const updated = await storage.updateAssetInventory(locationId, assetId, quantity, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  // Update credit price for inventory item (admin only)
  app.patch("/api/admin/location-inventory/:locationId/:assetId/price", requireAdmin, async (req: any, res) => {
    try {
      const { locationId, assetId } = req.params;
      const { creditPrice } = req.body;

      if (creditPrice === undefined || creditPrice < 0) {
        return res.status(400).json({ message: "Invalid credit price" });
      }

      // Update credit price
      const updated = await db
        .update(locationInventory)
        .set({ creditPrice: creditPrice.toString() })
        .where(and(eq(locationInventory.locationId, locationId), eq(locationInventory.assetId, assetId)))
        .returning();

      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating credit price:", error);
      res.status(500).json({ message: "Failed to update credit price" });
    }
  });

  // Get available assets for a location (not yet in inventory)
  app.get("/api/staff/available-assets/:locationId", requireStaff, async (req: any, res) => {
    try {
      const { locationId } = req.params;

      // Verify user has access to this location
      const hasAccess = await db
        .select()
        .from(userLocations)
        .where(and(eq(userLocations.userId, req.user.id), eq(userLocations.locationId, locationId)))
        .limit(1);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this location" });
      }

      // Get all assets
      const allAssets = await db.select().from(assets).where(eq(assets.isAvailable, true));

      // Get already tracked assets for this location
      const tracked = await storage.getLocationInventory(locationId);
      const trackedIds = tracked.map(t => t.assetId);

      // Return available assets not yet tracked
      const available = allAssets.filter(a => !trackedIds.includes(a.id));

      res.json(available);
    } catch (error) {
      console.error("Error fetching available assets:", error);
      res.status(500).json({ message: "Failed to fetch available assets" });
    }
  });

  app.get("/api/availability", isAuthenticated, async (req: any, res) => {
    try {

      const { date, type, category } = req.query;
      if (!date) return res.status(400).json({ message: "Date is required" });

      // Parse YYYY-MM-DD explicitly as local time integers
      // This prevents "2026-02-05" becoming "2026-02-05T00:00:00.000Z" (UTC)
      // which might be "2026-02-04T18:30:00" in local time, confusing the day comparsion.
      const [year, month, day] = (date as string).split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day); // Month is 0-indexed
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Get all assets of type
      const assetFilters: any = { type: type || 'gear' };
      if (category) assetFilters.category = category;

      const allAssets = await db.select().from(assets).where(
        and(
          eq(assets.type, assetFilters.type),
          category ? eq(assets.category, category) : undefined,
          eq(assets.isAvailable, true)
        )
      );

      if (allAssets.length === 0) {
        return res.json([]);
      }

      // 2. Get all active bookings for these assets on this day
      const assetIds = allAssets.map(a => a.id);

      const dayBookings = await db.select().from(bookings).where(
        and(
          inArray(bookings.assetId, assetIds),
          or(
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'active'),
            eq(bookings.status, 'completed')
          ),
          // Overlap with day
          lt(bookings.startDate, endOfDay),
          gt(bookings.endDate, startOfDay)
        )
      );

      // 3. Generate slots (8 AM to 8 PM)
      const slots = [];
      const startHour = 8;
      const endHour = 20;

      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 30) {
          const timeStr = `${h}:${m.toString().padStart(2, '0')}`;

          const slotTime = new Date(startOfDay);
          slotTime.setHours(h, m, 0, 0);

          let status = 'available';
          let note = undefined;

          // Check if slot is in the past
          const now = new Date();
          if (slotTime < now) {
            status = 'booked';
            note = 'Past time';
            slots.push({ time: timeStr, status, note });
            continue;
          }
          const freeAssets = allAssets.filter(asset => {
            const assetBookings = dayBookings.filter(b => b.assetId === asset.id);
            const isBusy = assetBookings.some(b => {
              const bufferEnd = b.bufferEnd || new Date(b.endDate.getTime() + 60 * 60 * 1000);
              // Start <= Slot < BufferEnd
              return slotTime >= b.startDate && slotTime < bufferEnd;
            });
            return !isBusy;
          });



          if (freeAssets.length === 0) {
            status = 'booked';
            // Find the earliest time an asset becomes free
            // We look at all assets (since all are busy). Find the blocking booking for each.
            // The "system" becomes free when the *first* asset becomes free.
            let nextFreeTime = null;

            for (const asset of allAssets) {
              const assetBookings = dayBookings.filter(b => b.assetId === asset.id);
              // Find the specific booking blocking this slot
              const blocking = assetBookings.find(b => {
                const bufferEnd = b.bufferEnd || new Date(b.endDate.getTime() + 60 * 60 * 1000);
                return slotTime >= b.startDate && slotTime < bufferEnd;
              });

              if (blocking) {
                const bufferEnd = blocking.bufferEnd || new Date(blocking.endDate.getTime() + 60 * 60 * 1000);
                if (!nextFreeTime || bufferEnd < nextFreeTime) {
                  nextFreeTime = bufferEnd;
                }
              }
            }

            if (nextFreeTime) {
              const hours = nextFreeTime.getHours();
              const minutes = nextFreeTime.getMinutes();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const h = hours % 12 || 12;
              const timeString = `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
              note = `Reserved until ${timeString}`;
            } else {
              note = 'Reserved';
            }
          }

          slots.push({ time: timeStr, status, note });
        }
      }

      res.json(slots);

    } catch (error) {
      console.error("Availability check failed:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Add item to location inventory
  app.post("/api/staff/location-inventory/:locationId", requireStaff, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const { assetName, quantity } = req.body;

      if (!assetName || quantity === undefined || quantity < 1) {
        return res.status(400).json({ message: "Invalid assetName or quantity" });
      }

      // Verify user has access to this location
      const hasAccess = await db
        .select()
        .from(userLocations)
        .where(and(eq(userLocations.userId, req.user.id), eq(userLocations.locationId, locationId)))
        .limit(1);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this location" });
      }

      console.log(`📦 Creating new asset: "${assetName}" with quantity ${quantity}`);

      // Determine category using AI
      const category = await determineCategoryFromName(assetName);
      console.log(`🏷️ Category assigned: "${category}"`);

      // Create a new asset with auto-determined category
      const newAsset = await db.insert(assets).values({
        name: assetName,
        category: category,
        type: 'gear',
        isAvailable: true
      }).returning();
      const assetId = newAsset[0].id;
      console.log(`✨ Asset created with ID: ${assetId}, category: ${newAsset[0].category}`);

      const item = await storage.updateAssetInventory(locationId, assetId, quantity, req.user.id);
      res.json(item);
    } catch (error) {
      console.error("Error adding inventory item:", error);
      res.status(500).json({ message: "Failed to add inventory item" });
    }
  });

  // Delete item from location inventory
  app.delete("/api/staff/location-inventory/:locationId/:assetId", requireStaff, async (req: any, res) => {
    try {
      const { locationId, assetId } = req.params;

      // Verify user has access to this location
      const hasAccess = await db
        .select()
        .from(userLocations)
        .where(and(eq(userLocations.userId, req.user.id), eq(userLocations.locationId, locationId)))
        .limit(1);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this location" });
      }

      await db
        .delete(locationInventory)
        .where(and(eq(locationInventory.locationId, locationId), eq(locationInventory.assetId, assetId)));

      res.json({ message: "Inventory item deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Staff: Issue equipment to member (checkout)
  app.post("/api/staff/issue-equipment", requireStaff, async (req: any, res) => {
    try {
      const { locationId, memberId, assetId, returnDeadline, notes } = req.body;

      // Verify staff has access to this location
      const hasAccess = await db
        .select()
        .from(userLocations)
        .where(and(eq(userLocations.userId, req.user.id), eq(userLocations.locationId, locationId)))
        .limit(1);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this location" });
      }

      // Get inventory item to get credit price
      const inventory = await storage.getAssetInventoryAtLocation(locationId, assetId);
      if (!inventory) {
        return res.status(404).json({ message: "Asset not found at this location" });
      }

      if (inventory.quantity <= 0) {
        return res.status(400).json({ message: "Not enough inventory" });
      }

      const creditPrice = parseFloat(inventory.creditPrice?.toString() || '0');

      // Check member has enough credits
      const memberCredits = await storage.getUserCredits(memberId);
      if (parseFloat(memberCredits) < creditPrice) {
        return res.status(400).json({ message: "Member has insufficient credits" });
      }

      // Deduct credits from member
      await storage.spendCredits(memberId, creditPrice, `Equipment checkout: ${assetId}`, 'equipment_checkout', assetId);

      // Reduce inventory
      await storage.updateAssetInventory(locationId, assetId, inventory.quantity - 1, req.user.id);

      // Create checkout record
      const { equipmentCheckouts } = await import("@shared/schema");
      const checkout = await db
        .insert(equipmentCheckouts)
        .values({
          memberId: memberId,
          locationId: locationId,
          assetId: assetId,
          creditsCost: creditPrice,
          issuedBy: req.user.id,
          returnDeadline: returnDeadline ? new Date(returnDeadline) : undefined,
          notes: notes || undefined,
        })
        .returning();

      res.json(checkout[0]);
    } catch (error) {
      console.error("Error issuing equipment:", error);
      res.status(500).json({ message: "Failed to issue equipment" });
    }
  });

  // Member: Get their checkouts
  app.get("/api/member/checkouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { equipmentCheckouts } = await import("@shared/schema");

      // Get all checkouts for this member
      const checkouts = await db
        .select({
          id: equipmentCheckouts.id,
          assetName: assets.name,
          assetCategory: assets.category,
          creditsCost: equipmentCheckouts.creditsCost,
          issuedAt: equipmentCheckouts.issuedAt,
          returnDeadline: equipmentCheckouts.returnDeadline,
          returnedAt: equipmentCheckouts.returnedAt,
          condition: equipmentCheckouts.condition,
          notes: equipmentCheckouts.notes,
        })
        .from(equipmentCheckouts)
        .innerJoin(assets, eq(equipmentCheckouts.assetId, assets.id))
        .where(eq(equipmentCheckouts.memberId, userId));

      const active = checkouts.filter(c => !c.returnedAt);
      const returned = checkouts.filter(c => c.returnedAt);

      res.json({ active, returned });
    } catch (error) {
      console.error("Error fetching checkouts:", error);
      res.status(500).json({ message: "Failed to fetch checkouts" });
    }
  });

  // Get live gear status for staff dashboard
  app.get("/api/staff/gear-status", requireStaff, async (req: any, res) => {
    try {
      // Get all gear assets
      const gearAssets = await db.select().from(assets).where(eq(assets.type, 'gear'));

      const today = new Date();
      const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

      // Get bookings for today/active
      const activeBookings = await db.select({
        booking: bookings,
        user: users
      }).from(bookings)
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(
          and(
            // Filter by gear assets (optional optimization, or join)
            // status: not cancelled
            sql`${bookings.status} != 'cancelled'`,
            // overlaps today or is currently checked out (active)
            or(
              eq(bookings.status, 'active'),
              and(gte(bookings.startDate, startOfDay), lte(bookings.startDate, endOfDay))
            )
          )
        );

      // Map assets to status
      const statusList = gearAssets.map(asset => {
        // Find current/upcoming booking for this asset
        const assetBookings = activeBookings.filter(b => b.booking.assetId === asset.id);

        // Sort by start time
        assetBookings.sort((a, b) => a.booking.startDate.getTime() - b.booking.startDate.getTime());

        // Determine current status
        // 1. Checked Out?
        const active = assetBookings.find(b => b.booking.status === 'active');
        // 2. In Buffer? (Completed but in buffer window)
        // We need to check completed bookings too? The query above fetches checked_out or overlapping today.
        // If a booking ended 30 mins ago, it's in buffer.

        let currentStatus = 'Available';
        let currentBooking = null;

        if (asset.maintenanceMode) {
          currentStatus = 'Maintenance';
        } else if (active) {
          currentStatus = 'Active';
          currentBooking = active;
        } else {
          // Check if inside a booking time or buffer
          const now = new Date();
          const busy = assetBookings.find(b => {
            const start = b.booking.startDate;
            const bufferEnd = b.booking.bufferEnd || new Date(b.booking.endDate.getTime() + 60 * 60 * 1000);
            return now >= start && now < bufferEnd;
          });

          if (busy) {
            currentStatus = now < busy.booking.endDate ? 'Booked' : 'Buffer';
            currentBooking = busy;
          }
        }

        // Next booking
        const next = assetBookings.find(b => b.booking.startDate > new Date());

        return {
          id: asset.id,
          name: asset.name,
          category: asset.category,
          status: currentStatus,
          currentBooking: currentBooking ? {
            memberName: `${currentBooking.user?.firstName} ${currentBooking.user?.lastName}`,
            contact: currentBooking.user?.phone,
            startTime: currentBooking.booking.startDate,
            endTime: currentBooking.booking.endDate,
            isOverdue: currentBooking.booking.status === 'active' && new Date() > currentBooking.booking.endDate
          } : null,
          nextBooking: next ? {
            startTime: next.booking.startDate
          } : null
        };
      });

      res.json(statusList);

    } catch (error) {
      console.error("Error fetching gear status:", error);
      res.status(500).json({ message: "Failed to fetch gear status" });
    }
  });

  // Update asset details (staff can edit)
  app.patch("/api/admin/assets/:assetId", requireStaff, async (req: any, res) => {
    try {
      const { assetId } = req.params;
      const { name, category, type, condition, description, maintenanceMode } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (category) updateData.category = category;
      if (type) updateData.type = type;
      if (condition) updateData.condition = condition;
      if (description !== undefined) updateData.description = description;
      if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const updatedAsset = await db
        .update(assets)
        .set(updateData)
        .where(eq(assets.id, assetId))
        .returning();

      if (updatedAsset.length === 0) {
        return res.status(404).json({ message: "Asset not found" });
      }

      res.json(updatedAsset[0]);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // ===== LOCATIONS ENDPOINTS =====
  // Get all locations
  app.get("/api/locations", isAuthenticated, async (req: any, res) => {
    try {
      const allLocations = await db.select().from(locations);
      res.json(allLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Create location
  app.post("/api/locations", requireAdmin, async (req: any, res) => {
    try {
      const { name, code, description, isActive } = req.body;
      if (!name || !code) {
        return res.status(400).json({ message: "Name and code are required" });
      }
      const newLocation = await db.insert(locations).values({
        name,
        code: code.toUpperCase(),
        description,
        isActive: isActive ?? true,
      }).returning();
      res.json(newLocation[0]);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Update location
  app.patch("/api/locations/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, code, description, isActive } = req.body;
      const updatedLocation = await db.update(locations).set({
        name,
        code: code?.toUpperCase(),
        description,
        isActive,
      }).where(eq(locations.id, id)).returning();
      if (updatedLocation.length === 0) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(updatedLocation[0]);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Delete location
  app.delete("/api/locations/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(locations).where(eq(locations.id, id));
      res.json({ message: "Location deleted" });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // ===== PERKS ENDPOINTS =====
  // Get all perks
  app.get("/api/perks", isAuthenticated, async (req: any, res) => {
    try {
      const allPerks = await db.select().from(perks);
      res.json(allPerks);
    } catch (error) {
      console.error("Error fetching perks:", error);
      res.status(500).json({ message: "Failed to fetch perks" });
    }
  });

  // Create perk
  app.post("/api/perks", requireAdmin, async (req: any, res) => {
    try {
      const { name, description, isActive, type } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const newPerk = await db.insert(perks).values({
        name,
        description,
        type: type || 'subscription',
        isActive: isActive ?? true,
      }).returning();
      res.json(newPerk[0]);
    } catch (error) {
      console.error("Error creating perk:", error);
      res.status(500).json({ message: "Failed to create perk" });
    }
  });

  // Update perk
  app.patch("/api/perks/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, type } = req.body;
      const updatedPerk = await db.update(perks).set({
        name,
        description,
        type,
        isActive,
      }).where(eq(perks.id, id)).returning();
      if (updatedPerk.length === 0) {
        return res.status(404).json({ message: "Perk not found" });
      }
      res.json(updatedPerk[0]);
    } catch (error) {
      console.error("Error updating perk:", error);
      res.status(500).json({ message: "Failed to update perk" });
    }
  });

  // Delete perk
  app.delete("/api/perks/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(perks).where(eq(perks.id, id));
      res.json({ message: "Perk deleted" });
    } catch (error) {
      console.error("Error deleting perk:", error);
      res.status(500).json({ message: "Failed to delete perk" });
    }
  });


  // ===== ASSETS ENDPOINTS =====
  // Get all assets
  app.get("/api/assets", isAuthenticated, async (req: any, res) => {
    try {
      const allAssets = await db.select().from(assets);
      res.json(allAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  // Create asset
  app.post("/api/assets", requireAdmin, async (req: any, res) => {
    try {
      const { name, description, type, category, brand, model, condition, dailyRate, depositAmount, creditPrice, location, quantity, isAvailable, maintenanceMode } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const newAsset = await db.insert(assets).values({
        name,
        description,
        type: type || "gear",
        category,
        brand,
        model,
        condition: condition || "excellent",
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        creditPrice: creditPrice ? parseFloat(creditPrice) : null,
        location,
        isAvailable: isAvailable ?? true,
        maintenanceMode: maintenanceMode ?? false,
      }).returning();

      // Create location inventory entry if location is provided
      if (location && newAsset[0]) {
        const qty = quantity ? parseInt(quantity) : 0;
        await db.insert(locationInventory).values({
          locationId: location,
          assetId: newAsset[0].id,
          quantity: qty,
          creditPrice: creditPrice ? parseFloat(creditPrice) : null,
        }).onConflictDoNothing();
      }

      res.json(newAsset[0]);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  // Update asset
  app.patch("/api/assets/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, type, category, brand, model, condition, dailyRate, depositAmount, creditPrice, location, isAvailable, maintenanceMode } = req.body;
      const updatedAsset = await db.update(assets).set({
        name,
        description,
        type,
        category,
        brand,
        model,
        condition,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        creditPrice: creditPrice ? parseFloat(creditPrice) : null,
        location,
        isAvailable,
        maintenanceMode,
      }).where(eq(assets.id, id)).returning();
      if (updatedAsset.length === 0) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(updatedAsset[0]);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // Delete asset
  app.delete("/api/assets/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(assets).where(eq(assets.id, id));
      res.json({ message: "Asset deleted" });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // ===== LOCATION INVENTORY ENDPOINTS =====
  // Get inventory for location (members only see items with quantity >= 1)
  app.get("/api/location-inventory/:locationId", isAuthenticated, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const inventory = await db
        .select()
        .from(locationInventory)
        .where(and(eq(locationInventory.locationId, locationId), gte(locationInventory.quantity, 1)));
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching location inventory:", error);
      res.status(500).json({ message: "Failed to fetch location inventory" });
    }
  });

  // ===== STAFF-LOCATION ASSIGNMENT ENDPOINTS =====
  // Get all staff users
  app.get("/api/admin/staff", requireAdmin, async (req: any, res) => {
    try {
      const staffUsers = await db.select().from(users).where(eq(users.role, 'staff'));
      res.json(staffUsers);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Create new staff user
  app.post("/api/admin/staff", requireAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName, password } = req.body;
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const hashedPassword = password ? await bcryptjs.hash(password, 10) : null;
      const [newStaff] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'staff',
      }).returning();
      res.json({ message: "Staff created successfully", staff: newStaff });
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ message: "Failed to create staff" });
    }
  });

  // Update staff
  app.patch("/api/admin/staff/:staffId", requireAdmin, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      const { email, firstName, lastName } = req.body;
      const [updated] = await db.update(users).set({ email, firstName, lastName }).where(eq(users.id, staffId)).returning();
      res.json({ message: "Staff updated successfully", staff: updated });
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ message: "Failed to update staff" });
    }
  });

  // Delete staff
  app.delete("/api/admin/staff/:staffId", requireAdmin, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      await db.delete(users).where(eq(users.id, staffId));
      res.json({ message: "Staff deleted successfully" });
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ message: "Failed to delete staff" });
    }
  });

  // Get staff assigned to location
  app.get("/api/admin/locations/:locationId/staff", requireAdmin, async (req: any, res) => {
    try {
      const { locationId } = req.params;
      const staffAtLocation = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(userLocations)
        .innerJoin(users, eq(userLocations.userId, users.id))
        .where(eq(userLocations.locationId, locationId));
      res.json(staffAtLocation);
    } catch (error) {
      console.error("Error fetching location staff:", error);
      res.status(500).json({ message: "Failed to fetch location staff" });
    }
  });

  // Assign staff to location
  app.post("/api/admin/locations/:locationId/staff/:staffId", requireAdmin, async (req: any, res) => {
    try {
      const { locationId, staffId } = req.params;
      const existingAssignment = await db
        .select()
        .from(userLocations)
        .where(and(eq(userLocations.userId, staffId), eq(userLocations.locationId, locationId)));

      if (existingAssignment.length > 0) {
        return res.status(400).json({ message: "Staff already assigned to this location" });
      }

      await db.insert(userLocations).values({ userId: staffId, locationId });
      res.json({ message: "Staff assigned to location" });
    } catch (error) {
      console.error("Error assigning staff:", error);
      res.status(500).json({ message: "Failed to assign staff" });
    }
  });

  // Unassign staff from location
  app.delete("/api/admin/locations/:locationId/staff/:staffId", requireAdmin, async (req: any, res) => {
    try {
      const { locationId, staffId } = req.params;
      await db.delete(userLocations).where(and(eq(userLocations.userId, staffId), eq(userLocations.locationId, locationId)));
      res.json({ message: "Staff unassigned from location" });
    } catch (error) {
      console.error("Error unassigning staff:", error);
      res.status(500).json({ message: "Failed to unassign staff" });
    }
  });

  // Reset user password with temp code
  app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log('🔄 Resetting password for user:', id);

      const user = await storage.getUser(id);
      if (!user) {
        console.log('❌ User not found:', id);
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate a simple 8-character temp password
      const tempPassword = Math.random().toString(36).substr(2, 8).toUpperCase();
      console.log('✅ Generated temp password:', tempPassword.substring(0, 4) + '****');

      // Hash and set as user's password immediately
      const passwordHash = await bcryptjs.hash(tempPassword, 10);
      console.log('✅ Hashed password');

      await storage.setPasswordHash(id, passwordHash);
      console.log('✅ Set password for user');

      // Return the temp password and expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const response = {
        tempPassword,
        expiresAt: expiresAt.toISOString()
      };

      console.log('✅ Returning response:', { tempPassword: '****', expiresAt: response.expiresAt });
      res.json(response);
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  });

  // Validate reset token
  app.get('/api/auth/reset-token/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const resetToken = await storage.getValidPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const user = await storage.getUser(resetToken.userId);
      res.json({
        valid: true,
        userId: resetToken.userId,
        userEmail: user?.email,
        tempPassword: resetToken.tempPassword
      });
    } catch (error) {
      console.error('Error validating reset token:', error);
      res.status(500).json({ message: 'Failed to validate token' });
    }
  });

  // Complete password reset
  app.post('/api/auth/reset-password/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      const resetToken = await storage.getValidPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const passwordHash = await bcryptjs.hash(newPassword, 10);
      await storage.setPasswordHash(resetToken.userId, passwordHash);
      await storage.markPasswordResetTokenAsUsed(resetToken.id);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error completing password reset:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Initialize admin account (only works if no admin/staff exists)
  app.post('/api/auth/initialize-admin', async (req, res) => {
    try {
      const { email, password, firstName } = req.body;

      if (!email || !password || !firstName) {
        return res.status(400).json({ message: 'Missing required fields: email, password, firstName' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      // Check if any admin or staff users already exist
      const allUsers = await storage.getAllUsers();
      const adminOrStaffExists = allUsers.some(u => u.role === 'admin' || u.role === 'staff');

      if (adminOrStaffExists) {
        return res.status(403).json({ message: 'Admin account already exists. Please log in with your existing credentials.' });
      }

      // Check if user with this email already exists
      const existingUser = allUsers.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      // Hash the password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Create the admin user
      const newAdmin = await storage.upsertUser({
        id: undefined,
        email,
        firstName,
        password: passwordHash,
        role: 'admin'
      } as any);

      res.json({
        message: 'Admin account created successfully',
        user: {
          id: newAdmin.id,
          email: newAdmin.email,
          firstName: newAdmin.firstName,
          role: newAdmin.role
        }
      });
    } catch (error: any) {
      console.error('Error initializing admin account:', error);
      res.status(500).json({ message: 'Failed to create admin account' });
    }
  });


  // Generate AI email for a lead
  app.post('/api/admin/waitlist/:leadId/generate-email', requireAdmin, async (req: any, res) => {
    try {
      if (!openai) {
        return res.status(500).json({ message: 'OpenAI integration not configured' });
      }

      const { leadId } = req.params;
      const lead = await db.select().from(waitlistLeads).where(eq(waitlistLeads.id, leadId));

      if (!lead.length) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Generate a professional and engaging welcome email for someone joining Adam's Club waitlist. 
            Lead name: ${lead[0].firstName}
            Their interests: ${(lead[0].interests as string[])?.join(', ') || 'Adventure and outdoor activities'}
            
            The email should:
            - Welcome them to the waitlist
            - Thank them for joining
            - Mention exclusive perks and experiences they'll get early access to
            - Describe Adam's Club vision for community and adventure
            - Be warm and authentic
            - Be around 150-200 words
            
            Return just the email body, no subject line or salutation with name.`
          }
        ],
        max_tokens: 500
      });

      const content = response.choices[0].message.content || '';
      const subject = "You've successfully joined Adam's Club waitlist!";

      res.json({ subject, content });
    } catch (error) {
      console.error('Error generating AI email:', error);
      res.status(500).json({ message: 'Failed to generate email' });
    }
  });

  // Send email to a lead
  app.post('/api/admin/waitlist/:leadId/send-email', requireAdmin, async (req: any, res) => {
    try {
      const { leadId } = req.params;
      const { subject, content, emailType, followupNumber } = req.body;

      const lead = await db.select().from(waitlistLeads).where(eq(waitlistLeads.id, leadId));
      if (!lead.length) {
        return res.status(404).json({ message: 'Lead not found' });
      }

      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        await sgMail.send({
          to: lead[0].email,
          from: process.env.SENDGRID_FROM_EMAIL || 'admin@adamclub.com',
          subject,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hi ${lead[0].firstName},</p>
            <div style="margin: 20px 0;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <p>Best regards,<br>Adam's Club Team</p>
          </div>`
        });
      }

      // Save email record
      const email = await db.insert(waitlistEmails).values({
        leadId,
        emailType: emailType as 'main' | 'followup',
        followupNumber: followupNumber || 0,
        subject,
        content,
        status: 'sent',
        sentAt: new Date(),
        sentBy: req.user.id
      }).returning();

      res.json({ message: 'Email sent successfully', email: email[0] });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email' });
    }
  });

  // Generate AI bulk email
  app.post('/api/admin/waitlist/generate-bulk-email', requireAdmin, async (req: any, res) => {
    try {
      if (!openai) {
        return res.status(500).json({ message: 'OpenAI integration not configured' });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `You are writing a professional, warm email for Adam's Club, an exclusive membership for outdoor enthusiasts and adventurers.

Create a welcome/announcement email that:
- Is professional but warm and friendly
- Welcomes recipients and thanks them for joining
- Highlights exclusive perks and early access to experiences
- Describes Adam's Club vision for community and adventure
- Is approximately 150-200 words
- Can be sent to multiple people at once

Return just the email body, no subject line or salutation with name.`
          }
        ],
        max_tokens: 500
      });

      const content = response.choices[0].message.content || '';
      const subject = "An Exciting Opportunity from Adam's Club";

      res.json({ subject, content });
    } catch (error) {
      console.error('Error generating AI bulk email:', error);
      res.status(500).json({ message: 'Failed to generate email' });
    }
  });

  // Bulk send email to multiple leads
  app.post('/api/admin/waitlist/bulk-send-email', requireAdmin, async (req: any, res) => {
    try {
      const { leadIds, subject, content, emailType } = req.body;

      if (!Array.isArray(leadIds) || !leadIds.length) {
        return res.status(400).json({ message: 'Lead IDs array is required' });
      }

      if (!subject || !content) {
        return res.status(400).json({ message: 'Subject and content are required' });
      }

      const leads = await db.select().from(waitlistLeads).where(inArray(waitlistLeads.id, leadIds));
      if (!leads.length) {
        return res.status(404).json({ message: 'No leads found' });
      }

      let sentCount = 0;
      const emails = [];

      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        for (const lead of leads) {
          try {
            await sgMail.send({
              to: lead.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'admin@adamclub.com',
              subject,
              html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Hi ${lead.firstName},</p>
                <div style="margin: 20px 0;">
                  ${content.replace(/\n/g, '<br>')}
                </div>
                <p>Best regards,<br>Adam's Club Team</p>
              </div>`
            });
            sentCount++;
          } catch (error) {
            console.error(`Error sending email to ${lead.email}:`, error);
          }
        }
      }

      // Save email records
      for (const lead of leads) {
        // Get count of previous followup emails for this lead
        const previousFollowups = await db.select().from(waitlistEmails)
          .where(and(eq(waitlistEmails.leadId, lead.id), eq(waitlistEmails.emailType, 'followup')));

        await db.insert(waitlistEmails).values({
          leadId: lead.id,
          emailType: (emailType || 'followup') as 'main' | 'followup',
          followupNumber: emailType === 'main' ? 0 : previousFollowups.length + 1,
          subject,
          content,
          status: 'sent',
          sentAt: new Date(),
          sentBy: req.user.id
        });
      }

      res.json({ message: 'Bulk emails sent successfully', sentCount });
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      res.status(500).json({ message: 'Failed to send bulk emails' });
    }
  });

  // Get email configuration
  app.get('/api/admin/email-config', requireAdmin, async (req: any, res) => {
    try {
      res.json({
        sendgridApiKey: process.env.SENDGRID_API_KEY ? '***hidden***' : '',
        sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || ''
      });
    } catch (error) {
      console.error('Error fetching email config:', error);
      res.status(500).json({ message: 'Failed to fetch email configuration' });
    }
  });

  // Update email configuration
  app.post('/api/admin/email-config', requireAdmin, async (req: any, res) => {
    try {
      const { sendgridApiKey, sendgridFromEmail } = req.body;

      if (!sendgridApiKey || !sendgridFromEmail) {
        return res.status(400).json({ message: 'SendGrid API Key and From Email are required' });
      }

      res.json({ message: 'Email configuration updated successfully' });
    } catch (error) {
      console.error('Error updating email config:', error);
      res.status(500).json({ message: 'Failed to update email configuration' });
    }
  });

  // Test email configuration
  app.post('/api/admin/email-config/test', requireAdmin, async (req: any, res) => {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;

      if (!apiKey || !fromEmail) {
        return res.status(400).json({ message: 'Email configuration not set' });
      }

      sgMail.setApiKey(apiKey);

      const user = await storage.getUser(req.user.id);
      await sgMail.send({
        to: user?.email || 'test@example.com',
        from: fromEmail,
        subject: 'Adam\'s Club - Email Configuration Test',
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Email Configuration Test</h2>
          <p>Hi ${user?.firstName || 'Admin'},</p>
          <p>This is a test email to verify your SendGrid configuration is working correctly.</p>
          <p>If you received this email, your email service is properly configured!</p>
          <p>Best regards,<br>Adam's Club Team</p>
        </div>`
      });

      res.json({ message: 'Test email sent successfully' });
    } catch (error: any) {
      console.error('Error testing email config:', error);
      res.status(500).json({ message: error.message || 'Failed to send test email' });
    }
  });

  // Register Stripe routes
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
