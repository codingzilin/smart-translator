"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
class AuthController {
    // 用户注册
    static async register(req, res) {
        try {
            const { email, username, password, confirmPassword } = req.body;
            // Input validation
            if (!email || !username || !password || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required",
                });
            }
            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Password confirmation does not match",
                });
            }
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long",
                });
            }
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email format",
                });
            }
            // Check if user already exists
            const existingUser = await User_1.User.findOne({
                $or: [{ email }, { username }],
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: existingUser.email === email
                        ? "Email is already registered"
                        : "Username is already taken",
                });
            }
            // Password encryption
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
            // Create user
            const user = new User_1.User({
                email,
                username,
                passwordHash,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                preferences: {
                    defaultTone: "natural",
                    language: "zh-CN",
                },
            });
            await user.save();
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
            logger_1.logger.info(`New user registered successfully: ${email}`);
            return res.status(201).json({
                success: true,
                message: "Registration successful",
                data: {
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        username: user.username,
                        preferences: user.preferences,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Registration failed:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    // User login
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            // Input validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required",
                });
            }
            // Find user
            const user = await User_1.User.findOne({ email });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password",
                });
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password",
                });
            }
            // Update last login time
            user.lastLoginAt = new Date();
            await user.save();
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
            logger_1.logger.info(`User logged in successfully: ${email}`);
            return res.json({
                success: true,
                message: "Login successful",
                data: {
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        username: user.username,
                        preferences: user.preferences,
                        lastLoginAt: user.lastLoginAt,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Login failed:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    // Get current user information
    static async me(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User_1.User.findById(userId).select("-passwordHash");
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            return res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        username: user.username,
                        preferences: user.preferences,
                        createdAt: user.createdAt,
                        lastLoginAt: user.lastLoginAt,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get user information:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    // User logout
    static async logout(req, res) {
        try {
            // In a real application, you can add token blacklist logic here
            logger_1.logger.info(`User logged out: ${req.user.email}`);
            return res.json({
                success: true,
                message: "Logout successful",
            });
        }
        catch (error) {
            logger_1.logger.error("Logout failed:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    // Change password
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword, confirmPassword } = req.body;
            const userId = req.user.userId;
            // Input validation
            if (!oldPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "All fields are required",
                });
            }
            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "New password confirmation does not match",
                });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "New password must be at least 6 characters long",
                });
            }
            // Find user
            const user = await User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Verify old password
            const isOldPasswordValid = await bcryptjs_1.default.compare(oldPassword, user.passwordHash);
            if (!isOldPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Old password is incorrect",
                });
            }
            // Encrypt new password
            const saltRounds = 12;
            const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
            // Update password
            user.passwordHash = newPasswordHash;
            await user.save();
            logger_1.logger.info(`User changed password successfully: ${user.email}`);
            return res.json({
                success: true,
                message: "Password changed successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to change password:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    // Refresh token
    static async refreshToken(req, res) {
        try {
            const userId = req.user.userId;
            const email = req.user.email;
            // Generate new JWT token
            const token = jsonwebtoken_1.default.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return res.json({
                success: true,
                message: "Token refreshed successfully",
                data: {
                    token,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Token refresh failed:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthControllers.js.map