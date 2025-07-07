import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email: string;
    };
  };
}

export function requireRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Import storage here to avoid circular dependency
      const { storage } = await import("../storage");
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Attach user data to request
      (req as any).userRole = user.role;
      (req as any).userData = user;
      
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({ message: "Authorization failed" });
    }
  };
}

export const requireEditor = requireRole(["editor"]);
export const requireAdmin = requireRole(["admin", "licensee"]);
export const requirePhotographer = requireRole(["photographer", "admin", "licensee"]);