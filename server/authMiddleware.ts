import type { RequestHandler } from "express";
import { isAuthenticated } from "./auth";
import { storage } from "./storage";

// Role-based access control middleware
export const requireRole = (roles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    // First check if user is authenticated
    return isAuthenticated(req, res, async () => {
      try {
        const userId = req.user?.claims?.sub;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        if (!roles.includes(user.role || 'member')) {
          return res.status(403).json({
            message: "Insufficient permissions",
            required: roles,
            current: user.role
          });
        }

        // Attach user to request for convenience
        req.currentUser = user;
        next();
      } catch (error) {
        console.error("Role check error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
  };
};

// Convenience middleware for specific roles
export const requireStaff: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = (req.user as any).id;
  const user = await storage.getUser(userId);

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (!['staff', 'admin'].includes(user.role || 'member')) {
    return res.status(403).json({
      message: "Insufficient permissions",
      required: ['staff', 'admin'],
      current: user.role
    });
  }

  req.currentUser = user;
  next();
};

export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = (req.user as any).id;
  const user = await storage.getUser(userId);

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (!['admin'].includes(user.role || 'member')) {
    return res.status(403).json({
      message: "Insufficient permissions",
      required: ['admin'],
      current: user.role
    });
  }

  req.currentUser = user;
  next();
};