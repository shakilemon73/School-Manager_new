import express from "express";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { 
  handleLogin, 
  handleLogout, 
  handleGetCurrentUser, 
  handleRegister,
  requireAuth, 
  requireRole 
} from "./portal-auth";
import { requireSchoolId, getSchoolId } from "./middleware/supabase-auth";

export function registerPortalRoutes(app: express.Application) {
  // Middleware
  app.use(cookieParser());

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/logout", handleLogout);
  app.get("/api/auth/user", handleGetCurrentUser);
  app.post("/api/auth/register", requireAuth, requireRole(["admin", "super_admin"]), requireSchoolId, handleRegister);

  // Portal redirect endpoint
  app.get("/api/portal/redirect", requireAuth, requireSchoolId, (req, res) => {
    const user = (req as any).user;
    let redirectUrl = "/";
    
    switch (user.role) {
      case "admin":
      case "super_admin":
        redirectUrl = "/admin";
        break;
      case "teacher":
        redirectUrl = "/teacher";
        break;
      case "student":
        redirectUrl = "/student";
        break;
      case "parent":
        redirectUrl = "/parent";
        break;
      default:
        redirectUrl = "/dashboard";
    }
    
    res.json({ redirectUrl });
  });

  // Admin portal routes
  app.get("/api/admin/*", requireAuth, requireRole(["admin", "super_admin"]), requireSchoolId, (req, res, next) => {
    next();
  });

  // Teacher portal routes
  app.get("/api/teacher/*", requireAuth, requireRole(["teacher", "admin", "super_admin"]), requireSchoolId, (req, res, next) => {
    next();
  });

  // Student portal routes
  app.get("/api/student/*", requireAuth, requireRole(["student", "teacher", "admin", "super_admin"]), requireSchoolId, (req, res, next) => {
    next();
  });

  // Parent portal routes
  app.get("/api/parent/*", requireAuth, requireRole(["parent", "admin", "super_admin"]), requireSchoolId, (req, res, next) => {
    next();
  });

  // User profile management
  app.get("/api/profile", requireAuth, requireSchoolId, async (req, res) => {
    try {
      const schoolId = getSchoolId(req) || req.user?.school_id;
      const user = (req as any).user;
      const userData = await storage.getUser(user.userId);
      
      if (!userData) {
        return res.status(404).json({ error: "User not found" });
      }

      if (userData.schoolId !== schoolId) {
        return res.status(403).json({ error: "Access denied to this user profile" });
      }

      res.json({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phoneNumber: userData.phoneNumber,
        profilePicture: userData.profilePicture,
        schoolId: userData.schoolId,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}