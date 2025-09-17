import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Reject plain text passwords for security
  if (!stored || !stored.includes(".")) {
    console.warn("Invalid password hash format detected");
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    console.error("Malformed password hash");
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Ensure buffers are the same length
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Use memory store for sessions to avoid PostgreSQL connection issues
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "school-management-super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // Set to false for development to work on HTTP
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.passwordHash))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username: req.body.username,
        name: req.body.name || req.body.full_name,
        email: req.body.email,
        passwordHash: await hashPassword(req.body.password),
        role: req.body.role || "user",
        phoneNumber: req.body.phone || req.body.phoneNumber
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  // Direct email/password login endpoint
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await comparePasswords(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        return res.status(200).json({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Disable the old authentication middleware - using unified Supabase auth instead
  // Old Passport.js authentication is replaced by unified Supabase authentication

  app.get("/api/user", async (req, res) => {
    try {
      let user = null;
      let userId = null;
      
      // Check for Supabase auth header first
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.VITE_SUPABASE_URL!,
          process.env.VITE_SUPABASE_ANON_KEY!
        );
        
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(
          authHeader.split(' ')[1]
        );
        
        if (supabaseUser && !error) {
          user = supabaseUser;
          userId = supabaseUser.id;
        }
      }
      
      // Fallback to Passport.js authentication
      if (!user) {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        user = req.user;
        userId = req.user?.id;
      }

      // Get user's credit balance from credit_balance table
      let creditBalance = null;
      if (userId) {
        try {
          const { db } = await import('../db/index.js');
          const { sql } = await import('drizzle-orm');
          
          const balance = await db.execute(sql`
            SELECT current_credits, bonus_credits, used_credits 
            FROM credit_balance 
            WHERE user_id = ${userId}::uuid;
          `);

          if (balance.length > 0) {
            creditBalance = {
              currentCredits: balance[0].current_credits || 0,
              bonusCredits: balance[0].bonus_credits || 0,
              usedCredits: balance[0].used_credits || 0
            };
          } else {
            // Create credit balance for user if doesn't exist
            const userEmail = user.email;
            const username = userEmail ? userEmail.split('@')[0] : 'user';
            
            await db.execute(sql`
              INSERT INTO credit_balance (
                user_id, username, email, full_name, current_credits
              ) VALUES (
                ${userId}::uuid, ${username}, ${userEmail}, ${username}, 500
              );
            `);

            creditBalance = {
              currentCredits: 500,
              bonusCredits: 0,
              usedCredits: 0
            };
          }
        } catch (creditError) {
          console.error('Credit balance fetch error:', creditError);
          // Don't fail the entire request if credit balance fails
          creditBalance = {
            currentCredits: 0,
            bonusCredits: 0,
            usedCredits: 0
          };
        }
      }

      // Return user with credit balance information
      const responseUser = {
        ...user,
        credits: creditBalance?.currentCredits || 0,
        creditBalance
      };

      res.json(responseUser);
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

// Function to seed a default admin user
export async function seedDefaultAdminUser() {
  try {
    const { storage } = await import("./storage");
    
    // Check if admin user already exists in storage
    const existingAdmin = await storage.getUserByEmail('admin@school.com');
    
    if (existingAdmin) {
      console.log("✓ Admin user already exists");
      return;
    }
    
    // Create default admin user through storage layer
    const hashedPassword = await hashPassword('admin123');
    
    await storage.createUser({
      username: 'admin',
      passwordHash: hashedPassword,
      email: 'admin@school.com',
      name: 'School Administrator',
      role: 'admin',
      phoneNumber: '+1234567890'
    });
    
    console.log("✓ Default admin user created (admin@school.com / admin123)");
  } catch (error: any) {
    console.log("⚠ Could not create admin user:", error.message);
  }
}