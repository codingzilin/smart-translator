"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const authMiddleware = async (req, res, next) => {
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
            logger_1.logger.error("JWT_SECRET is not defined in environment variables");
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Check if user still exists in database
        const user = await User_1.User.findById(decoded.userId).select("-passwordHash");
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
        await User_1.User.findByIdAndUpdate(decoded.userId, {
            lastLoginAt: new Date(),
        });
        next();
    }
    catch (error) {
        logger_1.logger.error("Authentication error:", error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: "Invalid token.",
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
exports.authMiddleware = authMiddleware;
// Optional middleware for routes that work with or without authentication
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            const jwtSecret = process.env.JWT_SECRET;
            if (token && jwtSecret) {
                const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
                const user = await User_1.User.findById(decoded.userId).select("-passwordHash");
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
    }
    catch (error) {
        // For optional auth, we don't return error, just continue without user
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
// Admin middleware (if needed for future admin features)
const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const user = await User_1.User.findById(req.user.userId);
        if (!user || !user.isAdmin) {
            res.status(403).json({
                success: false,
                message: "Admin access required.",
            });
            return;
        }
        next();
    }
    catch (error) {
        logger_1.logger.error("Admin middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Authorization check failed.",
        });
    }
};
exports.adminMiddleware = adminMiddleware;
//# sourceMappingURL=auth.js.map