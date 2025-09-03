"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationController = void 0;
const Translation_1 = require("../models/Translation");
const TranslationHistory_1 = require("../models/TranslationHistory");
const openaiService_1 = require("../services/openaiService");
const logger_1 = require("../utils/logger");
class TranslationController {
    // Execute translation
    static async translate(req, res) {
        try {
            const { text, tone, tags = [] } = req.body;
            const userId = req.user.userId;
            // Input validation
            if (!text || !text.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Translation text cannot be empty",
                });
            }
            if (text.length > 5000) {
                return res.status(400).json({
                    success: false,
                    message: "Translation text cannot exceed 5000 characters",
                });
            }
            const validTones = ["natural", "gentle", "cute", "depressed", "angry"];
            if (!validTones.includes(tone)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid tone type",
                });
            }
            // Detect original language (simple implementation)
            const originalLanguage = TranslationController.detectLanguage(text);
            // Call OpenAI API for translation
            const translatedText = await TranslationController.openaiService.translate(text, tone);
            if (!translatedText) {
                return res.status(500).json({
                    success: false,
                    message: "Translation failed, please try again",
                });
            }
            // Save translation record
            const translation = new Translation_1.Translation({
                userId,
                originalText: text.trim(),
                originalLanguage,
                translatedText,
                tone,
                tags,
                createdAt: new Date(),
                isFavorite: false,
            });
            await translation.save();
            // Record translation history
            const history = new TranslationHistory_1.TranslationHistory({
                userId,
                translationId: translation._id,
                accessedAt: new Date(),
            });
            await history.save();
            logger_1.logger.info(`Translation successful - User: ${userId}, Tone: ${tone}, Original length: ${text.length}`);
            res.json({
                success: true,
                message: "Translation successful",
                data: {
                    translation: {
                        id: translation._id,
                        originalText: translation.originalText,
                        originalLanguage: translation.originalLanguage,
                        translatedText: translation.translatedText,
                        tone: translation.tone,
                        tags: translation.tags,
                        createdAt: translation.createdAt,
                        isFavorite: translation.isFavorite,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Translation failed:", error);
            // Return different error messages based on error type
            if (error.message?.includes("rate limit")) {
                return res.status(429).json({
                    success: false,
                    message: "Too many requests, please try again later",
                });
            }
            if (error.message?.includes("API key")) {
                return res.status(500).json({
                    success: false,
                    message: "Service temporarily unavailable, please try again later",
                });
            }
            res.status(500).json({
                success: false,
                message: "Translation failed, please try again",
            });
        }
    }
    // Get translation history
    static async getTranslations(req, res) {
        try {
            const userId = req.user.userId;
            const { page = "1", limit = "20", tone, search, favorites, } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            // Build query conditions
            const query = { userId };
            if (tone && tone !== "all") {
                query.tone = tone;
            }
            if (search) {
                query.$or = [
                    { originalText: { $regex: search, $options: "i" } },
                    { translatedText: { $regex: search, $options: "i" } },
                ];
            }
            if (favorites === "true") {
                query.isFavorite = true;
            }
            // Query translation records
            const translations = await Translation_1.Translation.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select("-__v");
            // Get total count
            const total = await Translation_1.Translation.countDocuments(query);
            // Calculate pagination info
            const totalPages = Math.ceil(total / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            res.json({
                success: true,
                data: {
                    translations,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalItems: total,
                        itemsPerPage: limitNum,
                        hasNextPage,
                        hasPrevPage,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get translation history:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get translation history",
            });
        }
    }
    // Get single translation record
    static async getTranslation(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const translation = await Translation_1.Translation.findOne({
                _id: id,
                userId,
            }).select("-__v");
            if (!translation) {
                return res.status(404).json({
                    success: false,
                    message: "Translation record not found",
                });
            }
            // Update access history
            await TranslationHistory_1.TranslationHistory.findOneAndUpdate({ userId, translationId: id }, { accessedAt: new Date() }, { upsert: true });
            res.json({
                success: true,
                data: {
                    translation,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get translation record:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get translation record",
            });
        }
    }
    // Toggle favorite status
    static async toggleFavorite(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const translation = await Translation_1.Translation.findOne({
                _id: id,
                userId,
            });
            if (!translation) {
                return res.status(404).json({
                    success: false,
                    message: "Translation record not found",
                });
            }
            // Toggle favorite status
            translation.isFavorite = !translation.isFavorite;
            await translation.save();
            logger_1.logger.info(`User ${userId} ${translation.isFavorite ? "favorited" : "unfavorited"} translation record ${id}`);
            res.json({
                success: true,
                message: translation.isFavorite
                    ? "Added to favorites"
                    : "Removed from favorites",
                data: {
                    isFavorite: translation.isFavorite,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to toggle favorite status:", error);
            res.status(500).json({
                success: false,
                message: "Operation failed",
            });
        }
    }
    // Delete translation record
    static async deleteTranslation(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const translation = await Translation_1.Translation.findOne({
                _id: id,
                userId,
            });
            if (!translation) {
                return res.status(404).json({
                    success: false,
                    message: "Translation record not found",
                });
            }
            // Delete translation record
            await Translation_1.Translation.findByIdAndDelete(id);
            // Delete related history records
            await TranslationHistory_1.TranslationHistory.deleteMany({
                translationId: id,
            });
            logger_1.logger.info(`User ${userId} deleted translation record ${id}`);
            res.json({
                success: true,
                message: "Delete successful",
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to delete translation record:", error);
            res.status(500).json({
                success: false,
                message: "Delete failed",
            });
        }
    }
    // Batch delete translation records
    static async deleteTranslations(req, res) {
        try {
            const { ids } = req.body;
            const userId = req.user.userId;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please select translation records to delete",
                });
            }
            // Verify all records belong to current user
            const translations = await Translation_1.Translation.find({
                _id: { $in: ids },
                userId,
            });
            if (translations.length !== ids.length) {
                return res.status(400).json({
                    success: false,
                    message: "Some records do not exist or you don't have permission to delete them",
                });
            }
            // Delete translation records
            await Translation_1.Translation.deleteMany({
                _id: { $in: ids },
                userId,
            });
            // Delete related history records
            await TranslationHistory_1.TranslationHistory.deleteMany({
                translationId: { $in: ids },
            });
            logger_1.logger.info(`User ${userId} batch deleted translation records: ${ids.join(", ")}`);
            res.json({
                success: true,
                message: `Successfully deleted ${ids.length} records`,
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to batch delete translation records:", error);
            res.status(500).json({
                success: false,
                message: "Delete failed",
            });
        }
    }
    // Get translation statistics
    static async getStatistics(req, res) {
        try {
            const userId = req.user.userId;
            // Get total translations count
            const totalTranslations = await Translation_1.Translation.countDocuments({ userId });
            // Get favorites count
            const favoriteCount = await Translation_1.Translation.countDocuments({
                userId,
                isFavorite: true,
            });
            // Get tone usage statistics
            const toneStats = await Translation_1.Translation.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: "$tone",
                        count: { $sum: 1 },
                    },
                },
            ]);
            // Get translation trends for the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dailyStats = await Translation_1.Translation.aggregate([
                {
                    $match: {
                        userId,
                        createdAt: { $gte: thirtyDaysAgo },
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
                    totalTranslations,
                    favoriteCount,
                    toneStats,
                    dailyStats,
                },
            });
        }
        catch (error) {
            logger_1.logger.error("Failed to get translation statistics:", error);
            res.status(500).json({
                success: false,
                message: "Failed to get statistics",
            });
        }
    }
    // Simple language detection function
    static detectLanguage(text) {
        // Detect Chinese characters
        const chineseRegex = /[\u4e00-\u9fff]/;
        if (chineseRegex.test(text)) {
            return "zh-CN";
        }
        // Detect Japanese characters
        const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
        if (japaneseRegex.test(text)) {
            return "ja";
        }
        // Detect Korean characters
        const koreanRegex = /[\uac00-\ud7af]/;
        if (koreanRegex.test(text)) {
            return "ko";
        }
        // Detect Russian characters
        const russianRegex = /[\u0400-\u04ff]/;
        if (russianRegex.test(text)) {
            return "ru";
        }
        // Detect Arabic characters
        const arabicRegex = /[\u0600-\u06ff]/;
        if (arabicRegex.test(text)) {
            return "ar";
        }
        // Default to other languages
        return "auto";
    }
}
exports.TranslationController = TranslationController;
TranslationController.openaiService = new openaiService_1.OpenAIService();
//# sourceMappingURL=TranslationControllers.js.map