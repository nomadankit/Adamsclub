import type { Express } from "express";
import express from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { memberships, users, tiers, creditTransactions, bookings } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  createIntent,
  consumeIntent,
  getIntent,
  validatePlanSlug,
} from "./checkoutIntent";
import * as fs from 'fs';
import * as path from 'path';

let stripe: Stripe;

// Initialize Stripe with the secret key
if (process.env.STRIPE_SECRET_KEY) {
  console.log(
    "🔑 Initializing Stripe with Key Preview:",
    process.env.STRIPE_SECRET_KEY.substring(0, 20) + "...",
  );
  console.log(
    "🔑 Is Test Mode:",
    process.env.STRIPE_SECRET_KEY.startsWith("sk_test_"),
  );
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
} else {
  console.error("❌ STRIPE_SECRET_KEY environment variable not found");
}

export function initializeStripe(secretKey: string) {
  console.log(
    "🔑 Manually initializing Stripe with Key Preview:",
    secretKey.substring(0, 20) + "...",
  );
  console.log("🔑 Is Test Mode:", secretKey.startsWith("sk_test_"));
  stripe = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

export async function reinitializeStripe() {
  try {
    const { adminSettings } = await import("@shared/schema");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");

    const settings = await db.select().from(adminSettings).where(eq(adminSettings.key, 'STRIPE_SECRET_KEY'));
    const dbKey = settings[0]?.value;

    const secretKey = dbKey || process.env.STRIPE_SECRET_KEY;

    if (secretKey) {
      console.log("🔄 Re-initializing Stripe with new configuration...");
      initializeStripe(secretKey);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to reinitialize Stripe:", error);
    return false;
  }
}

export function getStripeInstance() {
  return stripe;
}

const DEBUG_LOG_PATH = path.join(process.cwd(), 'stripe_debug.log');

function logToFile(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, logMessage);
  } catch (e) {
    console.error("Failed to write to debug log", e);
  }
}

// Plan hierarchy for upgrade/downgrade restriction
// Users can only upgrade to a higher rank, or change plans if subscription is cancelled/expired
export const PLAN_HIERARCHY: Record<string, { rank: number; credits: number }> = {
  'base-explorer': { rank: 1, credits: 71 },
  'premium-adventurer': { rank: 2, credits: 110 },
  'vip-pathfinder': { rank: 3, credits: 200 },
  // Legacy plan mappings
  'base': { rank: 1, credits: 71 },
  'basic': { rank: 1, credits: 71 },
  'premium': { rank: 2, credits: 110 },
  'vip': { rank: 3, credits: 200 },
};

// Helper to normalize plan names
function normalizePlanName(plan: string): string {
  const normalized = plan.toLowerCase().trim();
  // Map legacy names to new names for consistency
  if (normalized === 'base' || normalized === 'basic') return 'base-explorer';
  if (normalized === 'premium') return 'premium-adventurer';
  if (normalized === 'vip') return 'vip-pathfinder';
  return normalized;
}

// Check if user can upgrade to target plan
export function canUpgradePlan(currentPlan: string | null, targetPlan: string): { allowed: boolean; reason: string } {
  if (!currentPlan) {
    return { allowed: true, reason: 'No current subscription' };
  }

  const normalizedCurrent = normalizePlanName(currentPlan);
  const normalizedTarget = normalizePlanName(targetPlan);

  const currentRank = PLAN_HIERARCHY[normalizedCurrent]?.rank || 0;
  const targetRank = PLAN_HIERARCHY[normalizedTarget]?.rank || 0;

  if (targetRank > currentRank) {
    return { allowed: true, reason: 'Upgrade to higher tier' };
  } else if (targetRank === currentRank) {
    return { allowed: false, reason: 'Already on this plan' };
  } else {
    return { allowed: false, reason: 'Cannot downgrade. Cancel your subscription or wait for it to expire to change to a lower tier.' };
  }
}

export function registerStripeRoutes(app: Express) {
  // Step 1: Create checkout intent (can be called unauthenticated)
  app.post("/api/checkout/intent", async (req: any, res) => {
    try {
      console.log("📥 Received checkout intent request:", req.body);
      const { planSlug } = req.body;

      if (!planSlug) {
        console.error("❌ Missing planSlug in request");
        return res.status(400).json({ error: "planSlug is required" });
      }

      // Validate plan slug against server-side allowlist
      const priceId = validatePlanSlug(planSlug);
      console.log("🔍 Validated plan:", { planSlug, priceId });

      if (!priceId) {
        console.error("❌ Invalid plan slug:", planSlug);
        return res.status(400).json({ error: "Invalid plan slug" });
      }

      // Create intent (with userId if authenticated)
      const isAuth = req.isAuthenticated();
      const userId = isAuth ? req.user.id : undefined;
      console.log("🔐 Auth status:", { isAuth, userId });

      const intent = createIntent(planSlug, userId);
      console.log("📋 Created intent:", intent.id);

      // If not authenticated, redirect to OAuth with callback
      if (!isAuth) {
        const callbackUrl = `/checkout/continue?intent=${intent.id}`;
        const redirectUrl = `/auth/google?state=${encodeURIComponent(callbackUrl)}`;
        console.log("🔄 Redirecting unauthenticated user to:", redirectUrl);
        return res.json({ redirect: redirectUrl });
      }

      // If authenticated, proceed to checkout continuation
      const redirectUrl = `/checkout/continue?intent=${intent.id}`;
      console.log("🔄 Redirecting authenticated user to:", redirectUrl);
      return res.json({ redirect: redirectUrl });
    } catch (error: any) {
      console.error("❌ Error creating checkout intent:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to create checkout intent",
        details: error.message,
      });
    }
  });

  // Check subscription upgrade eligibility
  app.get("/api/subscription/can-change/:targetPlan", isAuthenticated, async (req: any, res) => {
    try {
      const { targetPlan } = req.params;
      const userId = req.user.id;

      // Get user's current subscription
      const membership = await storage.getUserSubscription(userId);

      // If no membership or subscription is cancelled/expired, allow any plan selection
      if (!membership) {
        return res.json({
          canChange: true,
          reason: 'No current subscription',
          currentPlan: null,
          targetPlan,
          subscriptionActive: false
        });
      }

      // Check if subscription is cancelled or expired
      const now = new Date();
      const isExpired = membership.currentPeriodEnd && new Date(membership.currentPeriodEnd) < now;
      const isCancelled = membership.cancelAtPeriodEnd === true;
      const isInactive = membership.status !== 'active' && membership.status !== 'trialing';

      if (isExpired || isCancelled || isInactive) {
        return res.json({
          canChange: true,
          reason: isExpired ? 'Subscription expired' : isCancelled ? 'Subscription cancelled' : 'Subscription inactive',
          currentPlan: membership.plan,
          targetPlan,
          subscriptionActive: false
        });
      }

      // Check upgrade eligibility
      const upgradeCheck = canUpgradePlan(membership.plan, targetPlan);

      return res.json({
        canChange: upgradeCheck.allowed,
        reason: upgradeCheck.reason,
        currentPlan: membership.plan,
        targetPlan,
        subscriptionActive: true,
        currentPeriodEnd: membership.currentPeriodEnd
      });
    } catch (error: any) {
      console.error("❌ Error checking subscription eligibility:", error);
      res.status(500).json({ error: "Failed to check subscription eligibility" });
    }
  });

  // Step 2: Continue checkout after authentication
  app.get("/checkout/continue", isAuthenticated, async (req: any, res) => {
    try {
      const { intent: intentId } = req.query;

      if (!intentId) {
        return res.redirect("/pricing?error=missing_intent");
      }

      // Consume the intent (validates and claims it)
      const intent = consumeIntent(intentId as string, req.user.id);

      if (!intent) {
        return res.redirect("/pricing?error=invalid_intent");
      }

      // Create Stripe Checkout Session with the trusted price_id
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: intent.priceId, // Use server-validated price ID
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment-success?canceled=true`,
        client_reference_id: req.user.id,
        customer_email: req.user.email,
        metadata: {
          userId: req.user.id,
          planType: intent.planSlug,
          type: "subscription",
          intentId: intent.id,
        },
      });

      console.log(
        "✅ Checkout session created:",
        session.id,
        "for intent:",
        intent.id,
      );

      // Redirect to Stripe Checkout
      res.redirect(303, session.url!);
    } catch (error: any) {
      console.error("❌ Error continuing checkout:", error);
      res.redirect("/pricing?error=checkout_failed");
    }
  });

  // Step 3: Handle success callback (verify before showing success)
  app.get("/checkout/success", isAuthenticated, async (req: any, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.redirect("/account?error=missing_session");
      }

      // Verify the session with Stripe API
      const session = await stripe.checkout.sessions.retrieve(
        session_id as string,
      );

      // Verify session belongs to current user
      if (session.client_reference_id !== req.user.id) {
        return res.redirect("/account?error=unauthorized_session");
      }

      // Verify payment is complete
      if (session.payment_status !== "paid") {
        return res.redirect("/account?error=payment_incomplete");
      }

      // Sync payment status immediately (failsafe for webhooks)
      await handleSuccessfulPayment(session);

      // Redirect to account with success flag (session_id removed from URL)
      res.redirect("/account?upgraded=1");
    } catch (error: any) {
      console.error("❌ Error verifying checkout success:", error);
      res.redirect("/account?error=verification_failed");
    }
  });

  // Check payment session status
  app.get(
    "/api/stripe/session-status/:sessionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        console.log("🔍 Checking session status:", sessionId);

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Log if session doesn't belong to authenticated user (for debugging)
        if (session.client_reference_id !== userId) {
          console.log("⚠️ Session user mismatch - session:", session.client_reference_id, "authenticated:", userId);
        }

        res.json({
          status: session.status,
          payment_status: session.payment_status,
          customer_details: session.customer_details,
          amount_total: session.amount_total,
          metadata: session.metadata,
        });
      } catch (error: any) {
        console.error("❌ Error checking session status:", error.message);
        res.status(500).json({ error: "Failed to check session status" });
      }
    },
  );



  // Sync Payment Status Endpoint (Client-initiated fallback)
  // Note: This endpoint doesn't require isAuthenticated because we use the session's
  // client_reference_id for the user lookup, making it secure against tampering.
  app.post(
    "/api/stripe/sync-payment",
    async (req: any, res) => {
      console.log("📥 SYNC-PAYMENT ENDPOINT HIT");
      logToFile("📥 SYNC-PAYMENT ENDPOINT HIT", { body: req.body });
      try {
        const { sessionId } = req.body;
        const authenticatedUserId = req.user?.id || 'unauthenticated';

        logToFile("🔄 Sync request received", { sessionId, authenticatedUserId });
        console.log("🔄 Syncing payment status for session:", sessionId);

        if (!sessionId) {
          logToFile("❌ Session ID missing in request");
          console.error("❌ Session ID missing in request");
          return res.status(400).json({ error: "Session ID is required" });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log("📋 Session retrieved from Stripe:", {
          id: session.id,
          payment_status: session.payment_status,
          client_reference_id: session.client_reference_id,
          metadata: session.metadata
        });

        // Log the session details for debugging
        logToFile("Session details retrieved", {
          sessionId,
          clientReferenceId: session.client_reference_id,
          authenticatedUserId,
          paymentStatus: session.payment_status,
          metadata: session.metadata
        });

        // Use the session's client_reference_id (the user who created the checkout) for adding credits
        // This is the user who should receive the credits - secured by Stripe session
        const creditUserId = session.client_reference_id;

        if (!creditUserId) {
          logToFile("❌ No client_reference_id in session");
          console.error("❌ No client_reference_id in Stripe session");
          return res.status(400).json({ error: "Invalid session - no user reference" });
        }

        logToFile("Session payment status check", {
          status: session.status,
          payment_status: session.payment_status
        });

        if (session.payment_status === "paid") {
          console.log("✅ Payment status is PAID, processing...");
          logToFile("✅ Payment is PAID, calling handleSuccessfulPayment");

          // This function is idempotent, so it's safe to call multiple times
          await handleSuccessfulPayment(session);

          // Verify credits were added by fetching user
          const user = await storage.getUser(creditUserId);
          const currentCredits = user?.adamsCredits || '0.00';
          console.log(`✅ Sync complete. User ${creditUserId} credits balance: ${currentCredits}`);
          logToFile("✅ Sync complete", { userId: creditUserId, creditsBalance: currentCredits });

          // Calculate credits granted for subscriptions
          let creditsGranted: number | null = null;
          if (session.metadata?.type === "subscription") {
            const subscriptionCreditsMap: Record<string, number> = {
              'base-explorer': 71,
              'premium-adventurer': 110,
              'vip-pathfinder': 200,
              'basic': 71,
              'base': 71,
              'premium': 110,
              'vip': 200,
            };
            creditsGranted = subscriptionCreditsMap[session.metadata.planType?.toLowerCase()] || null;
          } else if (session.metadata?.type === "credits" && session.metadata?.credits) {
            creditsGranted = parseInt(session.metadata.credits);
          }

          res.json({
            success: true,
            status: "paid",
            userId: creditUserId,
            creditsBalance: currentCredits,
            creditsGranted
          });
        } else {
          console.log("⚠️ Payment status is NOT paid:", session.payment_status);
          logToFile("⚠️ Payment not paid", { payment_status: session.payment_status });
          res.json({ success: false, status: session.payment_status });
        }
      } catch (error: any) {
        logToFile("❌ Error syncing payment status", { error: error.message, stack: error.stack });
        console.error("❌ Error syncing payment status:", error.message);
        console.error("❌ Stack trace:", error.stack);
        res.status(500).json({ error: "Failed to sync payment status", details: error.message });
      }
    },
  );

  // Health check endpoint
  app.get("/api/stripe/health", (_req, res) => {
    const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
    const hasPublishableKey = !!process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const hasBasicPrice = !!process.env.VITE_STRIPE_BASIC_PRICE_ID;
    const hasPremiumPrice = !!process.env.VITE_STRIPE_PREMIUM_PRICE_ID;
    const hasVipPrice = !!process.env.VITE_STRIPE_VIP_PRICE_ID;

    res.json({
      ok: true,
      stripe_configured: !!stripe,
      test_mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
      config_status: {
        secret_key: hasSecretKey,
        publishable_key: hasPublishableKey,
        basic_price: hasBasicPrice,
        premium_price: hasPremiumPrice,
        vip_price: hasVipPrice,
      },
    });
  });

  // Create checkout session for subscription upgrades
  app.post(
    "/api/stripe/create-checkout-session",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { planType, priceId, tierId } = req.body;
        const userId = req.user.id;

        console.log("🔄 Creating subscription session:");
        console.log("📋 Plan Type:", planType);
        console.log("💰 Price ID:", priceId);
        console.log("🎯 Tier ID:", tierId);
        console.log("👤 User ID:", userId);

        // If tierId provided, look up the tier and get price ID from tier name
        let finalPriceId = priceId;
        if (tierId && !finalPriceId) {
          const tierResult = await db.select().from(tiers).where(eq(tiers.id, tierId)).limit(1);
          if (tierResult.length > 0) {
            const tier = tierResult[0];
            const tierNameLower = tier.name.toLowerCase();
            const priceIdMap: Record<string, string> = {
              'basic': process.env.VITE_STRIPE_BASIC_PRICE_ID || '',
              'premium': process.env.VITE_STRIPE_PREMIUM_PRICE_ID || '',
              'vip': process.env.VITE_STRIPE_VIP_PRICE_ID || '',
            };
            finalPriceId = priceIdMap[tierNameLower];
            console.log(`📍 Mapped tier "${tier.name}" to price ID:`, finalPriceId ? 'found' : 'not found');
          }
        }

        // If still no priceId, try to look up by planType
        if (!finalPriceId && planType) {
          const planPriceMap: Record<string, string> = {
            'basic': process.env.VITE_STRIPE_BASIC_PRICE_ID || '',
            'premium': process.env.VITE_STRIPE_PREMIUM_PRICE_ID || '',
            'vip': process.env.VITE_STRIPE_VIP_PRICE_ID || '',
            'base-explorer': process.env.STRIPE_BASE_EXPLORER_PRICE_ID || 'price_1SjNUDD0boAhB99ci0QnGBke',
            'premium-adventurer': process.env.STRIPE_PREMIUM_ADVENTURER_PRICE_ID || 'price_1SjNW3D0boAhB99cCpCEnhEj',
            'vip-pathfinder': process.env.STRIPE_VIP_PATHFINDER_PRICE_ID || 'price_1SjNWaD0boAhB99cTGYq3Dzh',
          };
          finalPriceId = planPriceMap[planType.toLowerCase()];
          console.log(`📍 Mapped planType "${planType}" to price ID:`, finalPriceId ? 'found' : 'not found');
        }

        console.log(
          "🔑 Stripe Secret Key exists:",
          !!process.env.STRIPE_SECRET_KEY,
        );
        console.log(
          "🔑 Stripe Publishable Key exists:",
          !!process.env.VITE_STRIPE_PUBLISHABLE_KEY,
        );
        console.log(
          "🔐 Webhook Secret exists:",
          !!process.env.STRIPE_WEBHOOK_SECRET,
        );
        console.log(
          "🧪 Stripe Test Mode:",
          process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"),
        );
        console.log("🔧 Stripe Instance initialized:", !!stripe);

        // Validate Stripe configuration
        if (!process.env.STRIPE_SECRET_KEY) {
          console.error("❌ STRIPE_SECRET_KEY is not set");
          throw new Error(
            "Stripe secret key is not configured. Please add STRIPE_SECRET_KEY to Secrets.",
          );
        }

        if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
          console.warn(
            "⚠️  Not using Stripe test mode! Key should start with sk_test_",
          );
        }

        if (!stripe) {
          console.error("❌ Stripe instance not found - initializing now...");
          initializeStripe(process.env.STRIPE_SECRET_KEY);
        }

        // Validate price ID format
        if (!finalPriceId) {
          console.error("❌ Missing price ID - cannot determine from tierId or priceId");
          throw new Error(
            "Missing price ID. Please ensure price IDs are configured.",
          );
        }

        if (!finalPriceId.startsWith("price_")) {
          console.error("❌ Invalid price ID format:", finalPriceId);
          throw new Error(
            `Invalid price ID format: ${finalPriceId}. Must start with "price_"`,
          );
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price: finalPriceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.protocol}://${req.get('host')}/payment-success?canceled=true`,
          client_reference_id: userId,
          metadata: {
            userId: userId,
            planType: planType,
            type: "subscription",
          },
        });

        console.log("✅ Checkout session created:", session.id);
        console.log(
          "🔗 Full session object:",
          JSON.stringify({
            id: session.id,
            url: session.url,
            mode: session.mode,
            status: session.status,
          }),
        );

        if (!session.url) {
          console.error("❌ No URL returned from Stripe session");
          throw new Error("Stripe did not return a checkout URL");
        }

        // Validate URL format
        if (!session.url.startsWith("https://checkout.stripe.com/")) {
          console.error("❌ Invalid Stripe URL format:", session.url);
          throw new Error("Invalid checkout URL received from Stripe");
        }

        console.log(
          "✅ Returning valid Stripe checkout URL to client:",
          session.url,
        );
        const responseData = { url: session.url };
        console.log("📤 Sending response:", JSON.stringify(responseData));
        res.json(responseData);
      } catch (error: any) {
        console.error("❌ Error creating checkout session:", {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          requestId: error.requestId,
        });
        res.status(500).json({
          error: "Failed to create checkout session",
          details: error.message,
        });
      }
    },
  );

  // Credit Packages Configuration
  const CREDIT_PACKAGES: Record<string, { priceId: string; credits: number; amount: number }> = {
    'starter': {
      priceId: process.env.STRIPE_CREDITS_STARTER_PRICE_ID || 'price_1SBLKcD0boAhB99cdO1JN3gi',
      credits: 100,
      amount: 19.99
    },
    'popular': {
      priceId: process.env.STRIPE_CREDITS_POPULAR_PRICE_ID || 'price_1SBLLJD0boAhB99c9NmfL6Ts',
      credits: 250,
      amount: 39.99
    },
    'value': {
      priceId: process.env.STRIPE_CREDITS_VALUE_PRICE_ID || 'price_1SBLLvD0boAhB99cUYZYSgZE',
      credits: 600,
      amount: 79.99
    },
    'premium': {
      priceId: process.env.STRIPE_CREDITS_PREMIUM_PRICE_ID || 'price_1SBLMWD0boAhB99cll1Wl2ko',
      credits: 1250,
      amount: 149.99
    }
  };

  app.post(
    "/api/stripe/create-credits-checkout",
    isAuthenticated,
    async (req: any, res) => {
      console.log("📥 CREATE-CREDITS-CHECKOUT endpoint hit");
      console.log("📦 Request body:", JSON.stringify(req.body));

      try {
        const { packageId } = req.body;
        const userId = req.user?.id;

        console.log("💳 Creating credits checkout session:", { packageId, userId });
        logToFile("Creating credits checkout", { packageId, userId, body: req.body });

        if (!userId) {
          console.error("❌ User not authenticated");
          return res.status(401).json({ error: "Not authenticated" });
        }

        // Validate package
        const pkg = CREDIT_PACKAGES[packageId];
        if (!pkg) {
          console.error("❌ Invalid package ID:", packageId);
          logToFile("Invalid package ID", { packageId, availablePackages: Object.keys(CREDIT_PACKAGES) });
          return res.status(400).json({ error: "Invalid credit package selected" });
        }

        console.log("📦 Selected Package:", pkg);

        if (!stripe) {
          console.error("❌ Stripe instance not found - initializing now...");
          if (process.env.STRIPE_SECRET_KEY) {
            initializeStripe(process.env.STRIPE_SECRET_KEY);
          } else {
            throw new Error("Stripe is not initialized. STRIPE_SECRET_KEY is missing.");
          }
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price: pkg.priceId,
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.protocol}://${req.get('host')}/payment-success?canceled=true`,
          client_reference_id: userId,
          metadata: {
            userId: userId,
            packageId: packageId,
            credits: pkg.credits.toString(),
            type: "credits",
          },
        });

        console.log("✅ Credits checkout session created:", session.id);
        res.json({ url: session.url });
      } catch (error: any) {
        console.error("❌ Error creating credits checkout session:", error);
        res.status(500).json({
          error: "Failed to create checkout session",
          details: error.message,
        });
      }
    },
  );

  // Manual payment confirmation endpoint for payment links
  app.post(
    "/api/stripe/confirm-payment",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { planType, credits, packageId } = req.body;
        const userId = req.user.id;

        console.log("📝 Manual payment confirmation:", {
          userId,
          planType,
          credits,
          packageId,
        });

        if (planType) {
          // Handle subscription upgrade
          await storage.updateUserSubscription(userId, {
            plan: planType,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          });

          await storage.createAuditLog({
            userId,
            action: "subscription_upgraded",
            entityType: "membership",
            entityId: userId,
            newValues: { plan: planType, method: "payment_link" },
          });

          console.log(
            `✅ Subscription updated for user ${userId} to plan ${planType}`,
          );
        }

        if (credits) {
          // Handle credits purchase
          const creditAmount = parseInt(credits);
          await storage.addCredits(
            userId,
            creditAmount,
            'PURCHASE',
            `Purchased ${creditAmount} Adventure Credits via payment link`
          );

          console.log(`✅ Added ${creditAmount} credits to user ${userId}`);
        }

        res.json({ success: true, message: "Payment confirmed successfully" });
      } catch (error: any) {
        console.error("❌ Error confirming payment:", error);
        res.status(500).json({ error: "Failed to confirm payment" });
      }
    },
  );

  // Webhook endpoint
  app.post(
    "/api/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;

      try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error(
            "❌ STRIPE_WEBHOOK_SECRET not found in environment variables",
          );
          throw new Error("Webhook secret not configured");
        }

        console.log("🔐 Webhook secret found, verifying signature...");
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log("✅ Webhook signature verified successfully");
      } catch (err: any) {
        console.error(`❌ Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      try {
        switch (event.type) {
          case "checkout.session.completed":
            const session = event.data.object as Stripe.Checkout.Session;
            await handleSuccessfulPayment(session);
            break;

          case "checkout.session.async_payment_failed":
            const failedSession = event.data.object as Stripe.Checkout.Session;
            await handleFailedPayment(failedSession);
            break;

          case "invoice.payment_succeeded":
            const invoice = event.data.object as Stripe.Invoice;
            await handleSubscriptionRenewal(invoice);
            break;

          case "customer.subscription.deleted":
            const subscription = event.data.object as Stripe.Subscription;
            await handleSubscriptionCancellation(subscription);
            break;

          default:
            console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    },
  );
}

export async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const metadata = session.metadata;

  console.log("🎉 STARTING handleSuccessfulPayment");
  console.log("PAYMENT SESSION:", JSON.stringify({
    id: session.id,
    userId,
    status: session.payment_status,
    metadata
  }, null, 2));

  if (!userId || !metadata) {
    console.error("❌ ABORTING: Missing userId or metadata");
    throw new Error("Missing userId or metadata");
  }

  try {
    if (metadata.type === "subscription") {
      console.log("Type: Subscription");
      logToFile("Processing subscription upgrade", { planType: metadata.planType });

      // Map plan types to credits granted on subscription
      const subscriptionCredits: Record<string, number> = {
        'base-explorer': 71,
        'premium-adventurer': 110,
        'vip-pathfinder': 200,
        // Legacy plan mappings
        'basic': 71,
        'base': 71,
        'premium': 110,
        'vip': 200,
      };

      // Map plan types to limits
      const planLimits: Record<string, number> = {
        starter: 10,
        basic: 10,
        premium: 25,
        vip: -1, // -1 means unlimited
        'base-explorer': 10,
        'premium-adventurer': 25,
        'vip-pathfinder': -1, // -1 means unlimited
      };

      const limit = planLimits[metadata.planType.toLowerCase()] || 10;
      const creditsToGrant = subscriptionCredits[metadata.planType.toLowerCase()] || 0;

      // Update user's subscription plan
      await storage.updateUserSubscription(userId, {
        plan: metadata.planType,
        status: "active",
        stripeSessionId: session.id,
        stripeCustomerId: session.customer as string,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        updatedAt: new Date(),
      });

      // Update booking status if this was a booking payment
      if (metadata.bookingId) {
        await db.update(bookings)
          .set({ status: 'pending' })
          .where(eq(bookings.id, metadata.bookingId));
        console.log(`✅ Updated booking ${metadata.bookingId} to pending status`);
      }

      // Update user's plan limit and reset usage
      const user = await storage.getUser(userId);
      if (user) {
        await storage.upsertUser({
          ...user,
          subscriptionPlan: metadata.planType,
          subscriptionLimit: limit.toString(),
          subscriptionUsage: "0",
        });
      }

      // Grant subscription credits on initial purchase
      if (creditsToGrant > 0) {
        const subscriptionId = session.subscription as string;

        // Check for idempotency to prevent double-crediting on subscription
        if (subscriptionId) {
          const existingTransaction = await db
            .select()
            .from(creditTransactions)
            .where(eq(creditTransactions.relatedEntityId, subscriptionId))
            .limit(1);

          if (existingTransaction.length > 0) {
            console.log(`⚠️ ALREADY PROCESSED: Subscription ${subscriptionId} credits already granted.`);
            logToFile("⚠️ ALREADY PROCESSED - Subscription credits idempotent check passed", { subscriptionId });
          } else {
            // Grant the subscription credits
            await storage.addCredits(
              userId,
              creditsToGrant,
              'PURCHASE',
              `${metadata.planType} subscription: ${creditsToGrant} Adventure Credits`,
              'subscription',
              subscriptionId
            );
            console.log(`✅ Granted ${creditsToGrant} subscription credits to user ${userId}`);
            logToFile("✅ Subscription credits granted", { userId, creditsToGrant, planType: metadata.planType });
          }
        } else {
          // No subscription ID, grant anyway but log warning
          await storage.addCredits(
            userId,
            creditsToGrant,
            'PURCHASE',
            `${metadata.planType} subscription: ${creditsToGrant} Adventure Credits`,
            'subscription',
            session.id
          );
          console.log(`✅ Granted ${creditsToGrant} subscription credits to user ${userId} (no subscription ID)`);
        }
      }

      console.log(
        `✅ Subscription updated for user ${userId} to plan ${metadata.planType} with limit ${limit}, credits granted: ${creditsToGrant}`,
      );


    } else if (metadata.type === "credits") {
      console.log("Type: CREDITS");
      logToFile("Processing CREDITS purchase", { userId, credits: metadata.credits });

      const paymentIntentId = session.payment_intent as string;
      console.log("Credits Amount:", metadata.credits);
      console.log("Payment Intent:", paymentIntentId);

      // Check for idempotency to prevent double-crediting
      if (paymentIntentId) {
        const existingTransaction = await db
          .select()
          .from(creditTransactions)
          .where(eq(creditTransactions.stripePaymentIntentId, paymentIntentId))
          .limit(1);

        if (existingTransaction.length > 0) {
          console.log(`⚠️ ALREADY PROCESSED: Payment intent ${paymentIntentId} exists.`);
          logToFile("⚠️ ALREADY PROCESSED - Idempotent check passed", { paymentIntentId });
          // IMPORTANT: Return TRUE/Success here because it IS verified, just already done.
          return;
        }
      }

      // Get user's current balance before adding credits
      const userBefore = await storage.getUser(userId);
      const balanceBefore = userBefore?.adamsCredits || '0.00';
      console.log(`📊 User ${userId} current balance BEFORE: ${balanceBefore}`);
      logToFile("Balance BEFORE credit addition", { userId, balanceBefore });

      // Add credits to user's account with transaction logging
      const credits = parseInt(metadata.credits);

      console.log("Attempting storage.addCredits...");
      logToFile("Calling storage.addCredits", { userId, credits, paymentIntentId });

      const transaction = await storage.addCredits(
        userId,
        credits,
        'PURCHASE',
        `Purchased ${credits} Adventure Credits`,
        'payment_session',
        session.id,
        paymentIntentId
      );

      // Verify the credits were added
      const userAfter = await storage.getUser(userId);
      const balanceAfter = userAfter?.adamsCredits || '0.00';
      console.log(`📊 User ${userId} balance AFTER: ${balanceAfter}`);
      console.log(`✅ SUCCESS: Added ${credits} credits to user ${userId}`);
      logToFile("✅ SUCCESS - Credits added", {
        userId,
        creditsAdded: credits,
        balanceBefore,
        balanceAfter,
        transactionId: transaction.id
      });

    } else {
      console.warn("⚠️ UNKNOWN METADATA TYPE:", metadata.type);
    }
  } catch (error) {
    console.error("❌ CRITICAL ERROR in handleSuccessfulPayment:", error);
    throw error; // Re-throw to make the sync endpoint fail
  }
}

async function handleFailedPayment(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;

  if (!userId) {
    console.error("Missing userId in failed payment session");
    return;
  }

  console.log(`Payment failed for user ${userId}, session ${session.id}`);
  // You can implement additional logic here like sending notifications
}

async function handleSubscriptionRenewal(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  if (!customerId || invoice.status !== 'paid') {
    console.log(`Invoice not paid or missing customer, skipping credit grant`);
    return;
  }

  try {
    // Find user by Stripe customer ID via memberships table
    const membershipData = await db
      .select({
        membership: memberships,
        user: users,
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.stripeCustomerId, customerId))
      .limit(1);

    if (!membershipData.length) {
      console.log(`❌ No membership found for customer ${customerId}`);
      return;
    }

    const { user, membership } = membershipData[0];
    if (!user || !membership) {
      console.log(`❌ Invalid user or membership data for customer ${customerId}`);
      return;
    }

    // Find the tier by name to get credits
    const tierData = await db
      .select()
      .from(tiers)
      .where(eq(tiers.name, membership.plan))
      .limit(1);

    if (!tierData.length || !tierData[0].creditsPerMonth) {
      console.log(`⚠️ No credits configured for tier ${membership.plan}`);
      return;
    }

    const tier = tierData[0];
    const creditsToGrant = tier.creditsPerMonth || 0;

    if (creditsToGrant > 0) {
      // Grant credits
      await storage.addUserCredits(user.id, creditsToGrant);
      console.log(`✅ Granted ${creditsToGrant} credits to user ${user.id} for ${membership.plan} subscription renewal`);
    } else {
      console.log(`⚠️ No credits to grant for ${membership.plan} subscription renewal`);
    }
  } catch (error) {
    console.error('❌ Error processing subscription renewal credit:', error);
  }
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription,
) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID and update subscription status
  console.log(`Subscription cancelled for customer ${customerId}`);
}
