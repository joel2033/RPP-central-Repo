import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Mock user data for no-auth mode
const MOCK_USER = {
  id: "demo-user",
  email: "demo@example.com",
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: null,
  role: "admin",
  licenseeId: "demo-user",
  claims: {
    sub: "demo-user",
    email: "demo@example.com",
    first_name: "Demo",
    last_name: "User",
    profile_image_url: null,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  }
};

export async function setupNoAuth(app: Express) {
  // Create demo user if it doesn't exist
  await storage.upsertUser({
    id: MOCK_USER.id,
    email: MOCK_USER.email,
    firstName: MOCK_USER.firstName,
    lastName: MOCK_USER.lastName,
    profileImageUrl: MOCK_USER.profileImageUrl,
    role: MOCK_USER.role,
    licenseeId: MOCK_USER.licenseeId
  });
  
  // Simple middleware to set mock user on all requests
  app.use((req: any, res, next) => {
    req.user = MOCK_USER;
    req.isAuthenticated = () => true;
    next();
  });
}

// Mock authentication middleware - always allows access
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Always allow access in no-auth mode
  next();
};