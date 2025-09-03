"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = require("../models/User");
const Translation_1 = require("../models/Translation");
const TranslationHistory_1 = require("../models/TranslationHistory");
const logger_1 = require("../utils/logger");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserController {
    // Get user profile
    static async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User_1.User.findById(userId).select("-passwordHash -__v");
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Get user translation statistics
            const translationStats = await UserController.getUserStats(userId);
            res.json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        email: user.email,
                        username: user.username,
                        preferences: user.preferences,
                        createdAt: user.createdAt,
                        lastLoginAt: user.lastLoginAt,
                        ...translationStats,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get user profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get user profile",
            });
        }
    }
    // Update user profile
    static async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { username, email } = req.body;
            // Input validation
            if (!username && !email) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide fields to update",
                });
            }
            const user = await User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Update username
            if (username) {
                if (username.length < 2 || username.length > 20) {
                    return res.status(400).json({
                        success: false,
                        message: "Username must be between 2-20 characters",
                    });
                }
                // Check if username is already taken
                const existingUser = await User_1.User.findOne({
                    username,
                    _id: { $ne: userId },
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Username is already taken",
                    });
                }
                user.username = username;
            }
            // Update email
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid email format",
                    });
                }
                // Check if email is already taken
                const existingUser = await User_1.User.findOne({
                    email,
                    _id: { $ne: userId },
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Email is already taken",
                    });
                }
                user.email = email;
            }
            await user.save();
            logger_1.logger.info(`User ${userId} updated profile successfully`);
            res.json({
                success: true,
                message: "Profile updated successfully",
                data: {
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
            logger_1.logger.error("Failed to update user profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update profile",
            });
        }
    }
    // Update user preferences
    static async updatePreferences(req, res) {
        try {
            const userId = req.user.userId;
            const { defaultTone, language, theme } = req.body;
            const user = await User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Validate and update default tone
            if (defaultTone) {
                const validTones = ["natural", "gentle", "cute", "depressed", "angry"];
                if (!validTones.includes(defaultTone)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid tone type",
                    });
                }
                user.preferences.defaultTone = defaultTone;
            }
            // Validate and update interface language
            if (language) {
                const validLanguages = ["zh-CN", "en-US", "ja", "ko"];
                if (!validLanguages.includes(language)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid language setting",
                    });
                }
                user.preferences.language = language;
            }
            // Validate and update theme setting
            if (theme) {
                const validThemes = ["light", "dark", "auto"];
                if (!validThemes.includes(theme)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid theme setting",
                    });
                }
                // Note: theme property is not supported in current User model
                // user.preferences.theme = theme;
            }
            await user.save();
            logger_1.logger.info(`User ${userId} updated preferences successfully`);
            res.json({
                success: true,
                message: "Preferences updated successfully",
                data: {
                    preferences: user.preferences,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to update preferences:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update preferences",
            });
        }
    }
    // Get user activity records
    static async getActivity(req, res) {
        try {
            const userId = req.user.userId;
            const { page = "1", limit = "20" } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Get recent translation history
            const activities = await TranslationHistory_1.TranslationHistory.find({ userId })
                .populate({
                path: "translationId",
                model: "Translation",
                select: "originalText translatedText tone createdAt",
            })
                .sort({ accessedAt: -1 })
                .skip(skip)
                .limit(limitNum);
            const total = await TranslationHistory_1.TranslationHistory.countDocuments({ userId });
            const totalPages = Math.ceil(total / limitNum);
            res.json({
                success: true,
                data: {
                    activities: activities.filter((activity) => activity.translationId), // Filter deleted translations
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get user activity records:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get activity records",
            });
        }
    }
    // Get user dashboard data
    static async getDashboard(req, res) {
        try {
            const userId = req.user.userId;
            // Get basic statistics
            const stats = await UserController.getUserStats(userId);
            // Get recent translation records
            const recentTranslations = await Translation_1.Translation.find({ userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("originalText translatedText tone createdAt isFavorite");
            // Get tone usage distribution
            const toneDistribution = await Translation_1.Translation.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: "$tone",
                        count: { $sum: 1 },
                        percentage: { $sum: 1 },
                    },
                },
            ]);
            // Calculate percentages
            const totalTranslations = stats.totalTranslations;
            toneDistribution.forEach((item) => {
                item.percentage =
                    totalTranslations > 0
                        ? Math.round((item.count / totalTranslations) * 100)
                        : 0;
            });
            // Get translation trends for the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const weeklyTrend = await Translation_1.Translation.aggregate([
                {
                    $match: {
                        userId,
                        createdAt: { $gte: sevenDaysAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
            ]);
            res.json({
                success: true,
                data: {
                    stats,
                    recentTranslations,
                    toneDistribution,
                    weeklyTrend,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get dashboard data:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get dashboard data",
            });
        }
    }
    // Delete user account
    static async deleteAccount(req, res) {
        try {
            const userId = req.user.userId;
            const { password, confirmText } = req.body;
            // Validate confirmation text
            if (confirmText !== "DELETE") {
                return res.status(400).json({
                    success: false,
                    message: "Please enter the correct confirmation text: DELETE",
                });
            }
            // Verify password
            const user = await User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Incorrect password",
                });
            }
            // Delete all user-related data
            await Promise.all([
                Translation_1.Translation.deleteMany({ userId }),
                TranslationHistory_1.TranslationHistory.deleteMany({ userId }),
                User_1.User.findByIdAndDelete(userId),
            ]);
            logger_1.logger.info(`User account deleted successfully: ${user.email}`);
            res.json({
                success: true,
                message: "Account deleted successfully",
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to delete user account:", error);
            res.status(500).json({
                success: false,
                message: "Failed to delete account",
            });
        }
    }
    // Export user data
    static async exportData(req, res) {
        try {
            const userId = req.user.userId;
            // Get user basic information
            const user = await User_1.User.findById(userId).select("-passwordHash -__v");
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Get all translation records
            const translations = await Translation_1.Translation.find({ userId }).select("-__v");
            // Get translation history
            const history = await TranslationHistory_1.TranslationHistory.find({ userId }).select("-__v");
            // Build export data
            const exportData = {
                user: {
                    id: user._id,
                    email: user.email,
                    username: user.username,
                    preferences: user.preferences,
                    createdAt: user.createdAt,
                    lastLoginAt: user.lastLoginAt,
                },
                translations,
                history,
                exportedAt: new Date(),
                version: "1.0",
            };
            logger_1.logger.info(`User ${userId} exported data`);
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="translation-data-${userId}.json"`);
            res.json({
                success: true,
                data: exportData,
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to export user data:", error);
            res.status(500).json({
                success: false,
                message: "Failed to export data",
            });
        }
    }
    // Helper method to get user statistics
    static async getUserStats(userId) {
        try {
            const [totalTranslations, favoriteCount, thisMonthCount, thisWeekCount] = await Promise.all([
                Translation_1.Translation.countDocuments({ userId }),
                Translation_1.Translation.countDocuments({ userId, isFavorite: true }),
                Translation_1.Translation.countDocuments({
                    userId,
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                }),
                Translation_1.Translation.countDocuments({
                    userId,
                    createdAt: {
                        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                }),
            ]);
            // Get most used tone
            const toneStats = await Translation_1.Translation.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: "$tone",
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 1 },
            ]);
            const mostUsedTone = toneStats.length > 0 ? toneStats[0]._id : null;
            return {
                totalTranslations,
                favoriteCount,
                thisMonthCount,
                thisWeekCount,
                mostUsedTone,
            };
        }
        catch (error) {
            logger_1.logger.error("Failed to get user statistics:", error);
            return {
                totalTranslations: 0,
                favoriteCount: 0,
                thisMonthCount: 0,
                thisWeekCount: 0,
                mostUsedTone: null,
            };
        }
    }
    // Reset user preferences
    static async resetPreferences(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            // Reset to default preferences
            user.preferences = {
                defaultTone: "natural",
                language: "zh-CN",
            };
            await user.save();
            logger_1.logger.info(`User ${userId} reset preferences`);
            res.json({
                success: true,
                message: "Preferences have been reset to default values",
                data: {
                    preferences: user.preferences,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to reset preferences:", error);
            res.status(500).json({
                success: false,
                message: "Failed to reset preferences",
            });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserControllers.js.map