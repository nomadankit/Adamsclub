import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import passport from "passport";
import { registerRoutes } from "./routes";
import { registerStripeRoutes } from "./stripeRoutes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";

process.on('unhandledRejection', (reason, promise) => {
  console.error('[PROCESS] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught Exception:', error);
});

const app = express();
app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration} ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)} `;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

let isInitialized = false;
let server: any = null;

export const initApp = async () => {
  if (isInitialized) return server;

  const { setupAuth } = await import("./auth");

  // Auto-create all tables in Postgres if they don't exist yet
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        first_name TEXT,
        last_name TEXT,
        profile_image_url TEXT,
        google_id TEXT UNIQUE,
        role TEXT DEFAULT 'member',
        phone TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        date_of_birth TEXT,
        waiver_accepted BOOLEAN DEFAULT false,
        waiver_accepted_at TIMESTAMP,
        marketing_opt_in BOOLEAN DEFAULT false,
        adams_credits TEXT DEFAULT '0.00',
        bio TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS memberships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        stripe_subscription_id TEXT UNIQUE,
        stripe_customer_id TEXT,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tiers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'subscription',
        price REAL,
        credits_per_month INTEGER DEFAULT 0,
        months_required INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS perks (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'subscription',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tier_perks (
        tier_id TEXT NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
        perk_id TEXT NOT NULL REFERENCES perks(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        category TEXT,
        brand TEXT,
        model TEXT,
        barcode TEXT UNIQUE,
        serial_number TEXT,
        condition TEXT DEFAULT 'excellent',
        status TEXT DEFAULT 'available',
        daily_rate REAL,
        deposit_amount REAL,
        credit_price REAL,
        main_price REAL,
        excellent_token_reward INTEGER DEFAULT 0,
        is_addon_only BOOLEAN DEFAULT false,
        capacity INTEGER DEFAULT 1,
        is_available BOOLEAN DEFAULT true,
        maintenance_mode BOOLEAN DEFAULT false,
        current_location_id TEXT REFERENCES locations(id),
        location TEXT,
        tags JSON,
        last_scanned_at TIMESTAMP,
        last_scanned_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS asset_images (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        alt_text TEXT,
        is_primary BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS waivers (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_waivers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        waiver_id TEXT NOT NULL REFERENCES waivers(id),
        accepted_at TIMESTAMP DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT
      );
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_global BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_locations (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        asset_id TEXT NOT NULL REFERENCES assets(id),
        status TEXT DEFAULT 'pending',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        total_amount REAL,
        deposit_amount REAL,
        deposit_captured BOOLEAN DEFAULT false,
        credits_used TEXT DEFAULT '0.00',
        paid_with_credits BOOLEAN DEFAULT false,
        stripe_payment_intent_id TEXT,
        stripe_deposit_intent_id TEXT,
        qr_code TEXT UNIQUE,
        qr_token TEXT UNIQUE,
        checked_out_at TIMESTAMP,
        checked_out_by TEXT REFERENCES users(id),
        checked_in_at TIMESTAMP,
        checked_in_by TEXT REFERENCES users(id),
        condition_status TEXT,
        condition_note TEXT,
        excellent_tokens_awarded INTEGER DEFAULT 0,
        damage_notes TEXT,
        damage_photos JSON,
        cancellation_reason TEXT,
        buffer_end_datetime TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS token_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        booking_id TEXT REFERENCES bookings(id),
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        amount TEXT NOT NULL,
        balance_after TEXT NOT NULL,
        description TEXT NOT NULL,
        related_entity_type TEXT,
        related_entity_id TEXT,
        stripe_payment_intent_id TEXT,
        processed_by TEXT REFERENCES users(id),
        metadata JSON,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        old_values JSON,
        new_values JSON,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS location_inventory (
        id TEXT PRIMARY KEY,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        credit_price REAL DEFAULT 0,
        last_updated_by TEXT REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS equipment_checkouts (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        credits_cost REAL NOT NULL,
        issued_by TEXT NOT NULL REFERENCES users(id),
        issued_at TIMESTAMP DEFAULT NOW(),
        return_deadline TIMESTAMP,
        returned_at TIMESTAMP,
        returned_by TEXT REFERENCES users(id),
        condition TEXT DEFAULT 'good',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS asset_scan_history (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        scanned_by TEXT NOT NULL REFERENCES users(id),
        location_id TEXT REFERENCES locations(id),
        action TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT,
        booking_id TEXT REFERENCES bookings(id),
        notes TEXT,
        damage_reported BOOLEAN DEFAULT false,
        scanned_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        temp_password TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS waitlist_leads (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        location TEXT,
        interests JSON,
        state TEXT NOT NULL,
        opt_in_marketing BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS waitlist_emails (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL REFERENCES waitlist_leads(id) ON DELETE CASCADE,
        email_type TEXT NOT NULL,
        followup_number INTEGER DEFAULT 0,
        subject TEXT,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        sent_at TIMESTAMP,
        sent_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS waitlist (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        opt_in_marketing BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_tier_benefits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_tier_id TEXT NOT NULL REFERENCES tiers(id),
        tier_type TEXT DEFAULT 'subscription',
        perk_id TEXT REFERENCES perks(id),
        monthly_allowance INTEGER DEFAULT 0,
        used_this_month INTEGER DEFAULT 0,
        last_reset_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS loyalty_tier_achievements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier_id TEXT NOT NULL REFERENCES tiers(id),
        months_of_subscription INTEGER NOT NULL,
        achieved_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_role_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        previous_role TEXT,
        new_role TEXT NOT NULL,
        changed_by TEXT REFERENCES users(id),
        reason TEXT,
        applied_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('⚠️ DB init error (tables may already exist):', err);
  }

  await setupAuth(app);

  registerStripeRoutes(app);

  server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[GLOBAL_ERROR]', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const code = err.code || 'INTERNAL_ERROR';

    if (!res.headersSent) {
      res.status(status).json({ message, code, details: err.details || null });
    }
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  isInitialized = true;
  return server;
};

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  (async () => {
    const activeServer = await initApp();
    const port = parseInt(process.env.PORT || "5000", 10);
    activeServer.listen(
      { port, host: "0.0.0.0" },
      () => log(`serving on port ${port} `)
    );
  })();
}

export default app;
