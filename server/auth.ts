
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from 'express';
import { createClient } from '@supabase/supabase-js';
import { SQLiteStore } from './session-store';

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  const sessionStore = new SQLiteStore();
  console.log('✅ Using persistent SQLite session store');

  return session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-this',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Local Strategy (Email/Password)
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
    async (email, password, done) => {
      try {
        const users = await storage.getAllUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Get the password hash from storage
        const passwordHash = await storage.getPasswordHash(user.id);
        if (!passwordHash) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check was removed to allow members to login

        const isValidPassword = await bcrypt.compare(password, passwordHash);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }));

  // Supabase Auth Strategy
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    console.log('✅ Supabase Auth configured');
  } else {
    console.warn('⚠️ Supabase Auth not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  // Sign up endpoint - DISABLED for public signups (only staff/admin can create accounts)
  app.post('/api/auth/signup', async (req, res) => {
    return res.status(403).json({ message: 'Public signup is disabled. Only staff and admin can create accounts. Please contact your administrator to join.' });
  });

  // Dev backdoor login endpoint
  app.get('/api/auth/dev-login/:email', async (req, res, next) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).send('Not found');
    }

    try {
      const users = await storage.getAllUsers();
      const user = users.find(u => u.email.toLowerCase() === req.params.email.toLowerCase());

      if (!user) {
        return res.status(404).json({ message: 'Dev user not found' });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.redirect('/');
      });
    } catch (e) {
      res.status(500).json({ message: 'Error in dev login' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication failed' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ success: true, user });
      });
    })(req, res, next);
  });

  // Supabase OAuth callback - handles all providers
  app.post('/api/auth/supabase/callback', async (req, res) => {
    try {
      const { access_token, refresh_token, user: supabaseUser, provider } = req.body;

      if (!access_token || !supabaseUser?.email) {
        return res.status(401).json({ message: 'Invalid Supabase authentication' });
      }

      const meta = supabaseUser.user_metadata || {};
      const fullName = meta.full_name || meta.name || supabaseUser.name || '';
      const firstName = meta.first_name || fullName.split(' ')[0] || '';
      const lastName = meta.last_name || fullName.split(' ').slice(1).join(' ') || '';

      // Check if user exists in storage
      try {
        const existingUsers = await storage.getAllUsers();
        let user = existingUsers.find(u => u.email === supabaseUser.email);

        // Extract profile image URL from Google OAuth metadata
        // Supabase stores the Google picture URL in the 'picture' field of user_metadata
        const profileImageUrl = supabaseUser.user_metadata?.picture ||
          supabaseUser.user_metadata?.avatar_url ||
          undefined;

        // If user doesn't exist, create them as a staff member (for OAuth flows)
        if (!user) {
          console.log(`Creating new user from OAuth: ${supabaseUser.email}`);
          user = await storage.upsertUser({
            id: supabaseUser.id || `google-${supabaseUser.id}`,
            email: supabaseUser.email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: profileImageUrl,
            role: 'member', // Default to member for all new users
            googleId: supabaseUser.id,
            waiverAccepted: false,
            marketingOptIn: false,
          });
          console.log(`✅ New user created with profile image: ${user.id} - ${profileImageUrl}`);
        } else {
          // For existing users, update with profile image if available, and fix missing names
          const updates: any = { id: user.id };
          let needsUpdate = false;

          if (profileImageUrl && profileImageUrl !== user.profileImageUrl) {
            updates.profileImageUrl = profileImageUrl;
            needsUpdate = true;
          }

          if ((!user.firstName && firstName) || (!user.lastName && lastName)) {
            updates.firstName = user.firstName || firstName;
            updates.lastName = user.lastName || lastName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            user = await storage.upsertUser(updates);
            console.log(`✅ Updated existing user profile: ${user.id}`);
          }
        }

        // Check was removed to allow members to login

        // Log user in via passport
        req.login(user, (err) => {
          if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Login failed' });
          }
          console.log(`✅ User logged in: ${user.id}`);
          res.json({ success: true, user });
        });
      } catch (dbError) {
        console.error('Database error checking user:', dbError);
        // If database is unavailable, reject the login attempt
        return res.status(503).json({ message: 'Service temporarily unavailable. Please try again.' });
      }
    } catch (error) {
      console.error('Supabase Auth error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Email/Password signup endpoint - now enabled for public signup
  app.post('/api/auth/signup/email', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUsers = await storage.getAllUsers();
      const existingUser = existingUsers.find(u => u.email === email);

      if (existingUser) {
        return res.status(409).json({ message: "You're already signed up! Try to login to your account." });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await storage.upsertUser({
        email: email,
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'member', // New users default to member role
        waiverAccepted: false,
        marketingOptIn: false,
      });

      // Store the password hash
      await storage.setPasswordHash(newUser.id, passwordHash);

      // Log user in
      req.login(newUser, (loginErr) => {
        if (loginErr) {
          console.error('Login error after signup:', loginErr);
          return res.status(500).json({ message: 'Signup successful but login failed' });
        }
        res.json({ success: true, user: newUser });
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Signup failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
        }

        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
