"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
// src/services/authService.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const logger_1 = require("../utils/logger");
const mongoose_1 = require("mongoose");
class AuthService {
    constructor() {
        this.saltRounds = 12;
        this.jwtExpiresIn = "7d"; // 7 days
        this.jwtSecret = process.env.JWT_SECRET || "";
        if (!this.jwtSecret) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
    }
    async register(registerData) {
        try {
            const { email, username, password } = registerData;
            // Check if user already exists
            const existingUser = await User_1.User.findOne({
                $or: [{ email }, { username }],
            });
            if (existingUser) {
                if (existingUser.email === email) {
                    throw new Error("User with this email already exists");
                }
                if (existingUser.username === username) {
                    throw new Error("Username is already taken");
                }
            }
            // Hash password
            const passwordHash = await bcryptjs_1.default.hash(password, this.saltRounds);
            // Create new user
            const user = new User_1.User({
                email,
                username,
                passwordHash,
                createdAt: new Date(),
                lastLoginAt: null,
                preferences: {
                    defaultTone: "natural",
                    language: "en",
                },
            });
            const savedUser = await user.save();
            // Generate JWT token
            const token = this.generateToken(savedUser);
            // Update last login time
            await User_1.User.findByIdAndUpdate(savedUser._id, {
                lastLoginAt: new Date(),
            });
            logger_1.logger.info("User registered successfully", {
                userId: savedUser._id?.toString() || "",
                email: savedUser.email,
                username: savedUser.username,
            });
            return {
                user: this.mapUserToProfile(savedUser),
                token,
            };
        }
        catch (error) {
            logger_1.logger.error("Registration failed:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Registration failed");
        }
    }
    async login(loginData) {
        try {
            const { email, password } = loginData;
            // Find user by email
            const user = await User_1.User.findOne({ email });
            if (!user) {
                throw new Error("Invalid email or password");
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                logger_1.logger.warn("Failed login attempt", {
                    email,
                    userId: user._id?.toString() || "",
                });
                throw new Error("Invalid email or password");
            }
            // Generate JWT token
            const token = this.generateToken(user);
            // Update last login time
            await User_1.User.findByIdAndUpdate(user._id, {
                lastLoginAt: new Date(),
            });
            logger_1.logger.info("User logged in successfully", {
                userId: user._id?.toString() || "",
                email: user.email,
                username: user.username,
            });
            return {
                user: this.mapUserToProfile(user),
                token,
            };
        }
        catch (error) {
            logger_1.logger.error("Login failed:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Login failed");
        }
    }
    async getUserById(userId) {
        try {
            const user = await User_1.User.findById(new mongoose_1.Types.ObjectId(userId)).select("-passwordHash");
            if (!user) {
                return null;
            }
            return this.mapUserToProfile(user);
        }
        catch (error) {
            logger_1.logger.error("Error fetching user by ID:", error);
            throw new Error("Failed to fetch user");
        }
    }
    async getUserByEmail(email) {
        try {
            const user = await User_1.User.findOne({ email }).select("-passwordHash");
            if (!user) {
                return null;
            }
            return this.mapUserToProfile(user);
        }
        catch (error) {
            logger_1.logger.error("Error fetching user by email:", error);
            throw new Error("Failed to fetch user");
        }
    }
    async updateProfile(userId, updates) {
        try {
            const { username, email } = updates;
            // Check if new username/email are already taken (excluding current user)
            if (username || email) {
                const conflictQuery = { _id: { $ne: new mongoose_1.Types.ObjectId(userId) } };
                const orConditions = [];
                if (username)
                    orConditions.push({ username });
                if (email)
                    orConditions.push({ email });
                if (orConditions.length > 0) {
                    conflictQuery.$or = orConditions;
                    const existingUser = await User_1.User.findOne(conflictQuery);
                    if (existingUser) {
                        if (existingUser.username === username) {
                            throw new Error("Username is already taken");
                        }
                        if (existingUser.email === email) {
                            throw new Error("Email is already registered");
                        }
                    }
                }
            }
            const updatedUser = await User_1.User.findByIdAndUpdate(new mongoose_1.Types.ObjectId(userId), { ...updates }, { new: true }).select("-passwordHash");
            if (!updatedUser) {
                throw new Error("User not found");
            }
            logger_1.logger.info("User profile updated", {
                userId,
                updates: Object.keys(updates),
            });
            return this.mapUserToProfile(updatedUser);
        }
        catch (error) {
            logger_1.logger.error("Error updating user profile:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Failed to update profile");
        }
    }
    async updatePreferences(userId, preferences) {
        try {
            const validTones = ["natural", "gentle", "cute", "depressed", "angry"];
            if (preferences.defaultTone &&
                !validTones.includes(preferences.defaultTone)) {
                throw new Error("Invalid tone preference");
            }
            const updatedUser = await User_1.User.findByIdAndUpdate(new mongoose_1.Types.ObjectId(userId), {
                $set: {
                    "preferences.defaultTone": preferences.defaultTone,
                    "preferences.language": preferences.language,
                },
            }, { new: true }).select("-passwordHash");
            if (!updatedUser) {
                throw new Error("User not found");
            }
            logger_1.logger.info("User preferences updated", {
                userId,
                preferences,
            });
            return this.mapUserToProfile(updatedUser);
        }
        catch (error) {
            logger_1.logger.error("Error updating user preferences:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Failed to update preferences");
        }
    }
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Find user with password hash
            const user = await User_1.User.findById(new mongoose_1.Types.ObjectId(userId));
            if (!user) {
                throw new Error("User not found");
            }
            // Verify current password
            const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                throw new Error("Current password is incorrect");
            }
            // Hash new password
            const newPasswordHash = await bcryptjs_1.default.hash(newPassword, this.saltRounds);
            // Update user's password
            await User_1.User.findByIdAndUpdate(new mongoose_1.Types.ObjectId(userId), {
                passwordHash: newPasswordHash,
            });
            logger_1.logger.info("Password changed successfully", { userId });
        }
        catch (error) {
            logger_1.logger.error("Error changing password:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Failed to change password");
        }
    }
    generateToken(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            username: user.username,
        };
        return jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
        });
    }
    mapUserToProfile(user) {
        return {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            preferences: {
                defaultTone: user.preferences?.defaultTone || "natural",
                language: user.preferences?.language || "en",
            },
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map