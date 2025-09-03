// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { logger } from "../utils/logger";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
      return;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET is not defined in environment variables");
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Check if user still exists in database
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Token is valid but user no longer exists.",
      });
      return;
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
    };

    // Update last login time
    await User.findByIdAndUpdate(decoded.userId, {
      lastLoginAt: new Date(),
    });

    next();
  } catch (error) {
    logger.error("Authentication error:", error as Error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

// Optional middleware for routes that work with or without authentication
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (token && jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
        const user = await User.findById(decoded.userId).select(
          "-passwordHash"
        );

        if (user) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username,
          };
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't return error, just continue without user
    next();
  }
};

// Admin middleware (if needed for future admin features)
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(403).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    // TODO: Add admin role support in User model
    // For now, we'll use a simple check based on email or username
    // This is not secure for production - implement proper role-based access control
    if (user.email !== "admin@example.com") {
      res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("Admin middleware error:", error as Error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed.",
    });
  }
};
