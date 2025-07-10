import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../replitAuth";

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRole = req.user.role || "licensee";
    
    // TEMPORARY: Grant editor access for testing (remove after testing)
    const userId = req.user.claims?.sub;
    if (userId === "44695535" && allowedRoles.includes("editor")) {
      // Grant editor access for testing
      req.userData = { role: "editor", licenseeId: userId };
      return next();
    }
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: "Access denied", 
        message: `This endpoint requires one of these roles: ${allowedRoles.join(", ")}. Your role: ${userRole}` 
      });
    }

    next();
  };
}

// Specific role middleware
export const requireAdmin = requireRole(["admin"]);
export const requireEditor = requireRole(["editor"]);
export const requirePhotographer = requireRole(["photographer"]);
export const requireVA = requireRole(["va"]);
export const requireAdminOrVA = requireRole(["admin", "va"]);
export const requireProductionStaff = requireRole(["admin", "va", "photographer"]);