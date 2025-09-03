"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRateLimit = exports.burstProtection = exports.checkPremiumStatus = exports.customRateLimit = exports.exportRateLimit = exports.premiumRateLimit = exports.passwordRateLimit = exports.authRateLimit = exports.rateLimit = exports.generalRateLimit = void 0;
const logger_1 = require("../utils/logger");
// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = {};
// Cleanup old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    Object.keys(rateLimitStore).forEach((key) => {
        if (rateLimitStore[key].resetTime < now) {
            delete rateLimitStore[key];
        }
    });
}, 10 * 60 * 1000);
const createRateLimiter = (options) => {
    const { windowMs, maxRequests, message = "Too many requests, please try again later.", skipSuccessfulRequests = false, keyGenerator = (req) => req.ip || "unknown", } = options;
    return (req, res, next) => {
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
            const resetTimeRemaining = Math.ceil((rateLimitData.resetTime - now) / 1000);
            logger_1.logger.warn(`Rate limit exceeded for key: ${key}, IP: ${req.ip}, User: ${req.user?.userId || "anonymous"}`);
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
            res.end = function (...args) {
                if (res.statusCode < 400) {
                    rateLimitData.count = Math.max(0, rateLimitData.count - 1);
                }
                return originalEnd.apply(this, args);
            };
        }
        next();
    };
};
// General API rate limiting
exports.generalRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: "Too many API requests, please try again in 15 minutes.",
});
// Translation-specific rate limiting (more restrictive due to OpenAI API costs)
exports.rateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 translations per hour
    message: "Translation limit exceeded. You can perform up to 50 translations per hour.",
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise fall back to IP
        return req.user?.userId || req.ip || "anonymous";
    },
});
// Authentication rate limiting (login/register)
exports.authRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    message: "Too many authentication attempts, please try again in 15 minutes.",
    skipSuccessfulRequests: true,
});
// Strict rate limiting for password-related operations
exports.passwordRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 password change attempts per hour
    message: "Too many password change attempts, please try again in 1 hour.",
});
// Premium user rate limiting (higher limits for future premium features)
exports.premiumRateLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 200, // 200 translations per hour for premium users
    message: "Premium translation limit exceeded. You can perform up to 200 translations per hour.",
    keyGenerator: (req) => {
        return req.user?.userId || req.ip || "anonymous";
    },
});
// Export rate limiting (data export)
exports.exportRateLimit = createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 5, // 5 data exports per day
    message: "Too many data export requests, please try again tomorrow.",
    keyGenerator: (req) => {
        return req.user?.userId || req.ip || "anonymous";
    },
});
// Custom rate limiter for specific endpoints
const customRateLimit = (options) => {
    return createRateLimiter(options);
};
exports.customRateLimit = customRateLimit;
// Middleware to check if user is premium (for future premium features)
const checkPremiumStatus = (req, res, next) => {
    // This would check user's premium status from database
    // For now, we'll assume all users are free tier
    const isPremium = false; // Would be: req.user?.isPremium || false
    if (isPremium) {
        // Use premium rate limiting
        (0, exports.premiumRateLimit)(req, res, next);
    }
    else {
        // Use regular rate limiting
        (0, exports.rateLimit)(req, res, next);
    }
};
exports.checkPremiumStatus = checkPremiumStatus;
// Burst protection middleware for sudden spikes
exports.burstProtection = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute window
    maxRequests: 10, // Max 10 requests per minute
    message: "Request rate too high, please slow down.",
});
// Global rate limiting middleware
exports.globalRateLimit = createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute globally
    message: "Server is receiving too many requests, please try again later.",
});
//# sourceMappingURL=rateLimit.js.map