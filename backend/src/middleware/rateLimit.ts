// src/middleware/rateLimit.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 10 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later.",
    skipSuccessfulRequests = false,
    keyGenerator = (req: Request) => req.ip || "unknown",
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Initialize or get existing rate limit data
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const rateLimitData = rateLimitStore[key];

    // Check if limit exceeded
    if (rateLimitData.count >= maxRequests) {
      const resetTimeRemaining = Math.ceil(
        (rateLimitData.resetTime - now) / 1000
      );

      logger.warn(
        `Rate limit exceeded for key: ${key}, IP: ${req.ip}, User: ${
          req.user?.userId || "anonymous"
        }`
      );

      res.status(429).json({
        success: false,
        message,
        retryAfter: resetTimeRemaining,
        limit: maxRequests,
        windowMs: windowMs / 1000,
      });
      return;
    }

    // Increment counter
    rateLimitData.count++;

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": (maxRequests - rateLimitData.count).toString(),
      "X-RateLimit-Reset": new Date(rateLimitData.resetTime).toISOString(),
    });

    // Store original end method to handle successful requests
    if (skipSuccessfulRequests) {
      const originalEnd = res.end;
      res.end = function (this: Response, ...args: any[]) {
        if (res.statusCode < 400) {
          rateLimitData.count = Math.max(0, rateLimitData.count - 1);
        }
        return originalEnd.apply(this, args as any);
      };
    }

    next();
  };
};

// General API rate limiting
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: "Too many API requests, please try again in 15 minutes.",
});

// Translation-specific rate limiting (more restrictive due to OpenAI API costs)
export const rateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 translations per hour
  message:
    "Translation limit exceeded. You can perform up to 50 translations per hour.",
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.userId || req.ip || "anonymous";
  },
});

// Authentication rate limiting (login/register)
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Too many authentication attempts, please try again in 15 minutes.",
  skipSuccessfulRequests: true,
});

// Strict rate limiting for password-related operations
export const passwordRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 password change attempts per hour
  message: "Too many password change attempts, please try again in 1 hour.",
});

// Premium user rate limiting (higher limits for future premium features)
export const premiumRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 200, // 200 translations per hour for premium users
  message:
    "Premium translation limit exceeded. You can perform up to 200 translations per hour.",
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || "anonymous";
  },
});

// Export rate limiting (data export)
export const exportRateLimit = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5, // 5 data exports per day
  message: "Too many data export requests, please try again tomorrow.",
  keyGenerator: (req: Request) => {
    return req.user?.userId || req.ip || "anonymous";
  },
});

// Custom rate limiter for specific endpoints
export const customRateLimit = (options: RateLimitOptions) => {
  return createRateLimiter(options);
};

// Middleware to check if user is premium (for future premium features)
export const checkPremiumStatus = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // This would check user's premium status from database
  // For now, we'll assume all users are free tier
  const isPremium = false; // Would be: req.user?.isPremium || false

  if (isPremium) {
    // Use premium rate limiting
    premiumRateLimit(req, res, next);
  } else {
    // Use regular rate limiting
    rateLimit(req, res, next);
  }
};

// Burst protection middleware for sudden spikes
export const burstProtection = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute window
  maxRequests: 10, // Max 10 requests per minute
  message: "Request rate too high, please slow down.",
});

// Global rate limiting middleware
export const globalRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute globally
  message: "Server is receiving too many requests, please try again later.",
});
