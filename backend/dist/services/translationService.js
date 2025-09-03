"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
// src/services/translationService.ts
const Translation_1 = require("../models/Translation");
const TranslationHistory_1 = require("../models/TranslationHistory");
const openaiService_1 = require("./openaiService");
const logger_1 = require("../utils/logger");
const mongoose_1 = require("mongoose");
class TranslationService {
    constructor() {
        this.openaiService = new openaiService_1.OpenAIService();
    }
    async createTranslation(request) {
        try {
            const { text, tone, originalLanguage, tags = [], userId } = request;
            logger_1.logger.info("Creating translation", {
                userId,
                textLength: text.length,
                tone,
                originalLanguage,
            });
            // Perform translation using OpenAI service
            const translationResult = await this.openaiService.translateWithDetails(text, tone);
            // Create translation record in database
            const translation = new Translation_1.Translation({
                userId: new mongoose_1.Types.ObjectId(userId),
                originalText: text,
                originalLanguage: originalLanguage || translationResult.detectedLanguage || "unknown",
                translatedText: translationResult.translatedText,
                tone,
                createdAt: new Date(),
                isFavorite: false,
                tags: tags.filter((tag) => tag.trim().length > 0), // Remove empty tags
            });
            const savedTranslation = await translation.save();
            // Record in translation history
            await this.recordTranslationHistory(userId, savedTranslation._id?.toString() || "");
            logger_1.logger.info("Translation created successfully", {
                translationId: savedTranslation._id,
                userId,
                confidence: translationResult.confidence,
            });
            return this.mapTranslationToResponse(savedTranslation);
        }
        catch (error) {
            logger_1.logger.error("Translation creation failed:", error);
            throw new Error(`Translation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getTranslationById(id, userId) {
        try {
            const translation = await Translation_1.Translation.findOne({
                _id: new mongoose_1.Types.ObjectId(id),
                userId: new mongoose_1.Types.ObjectId(userId),
            });
            if (!translation) {
                return null;
            }
            // Record access in history
            await this.recordTranslationHistory(userId, id);
            return this.mapTranslationToResponse(translation);
        }
        catch (error) {
            logger_1.logger.error("Error fetching translation by ID:", error);
            throw new Error("Failed to fetch translation");
        }
    }
    async getUserTranslations(userId, options) {
        try {
            const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", } = options;
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
            const [translations, totalCount] = await Promise.all([
                Translation_1.Translation.find({ userId: new mongoose_1.Types.ObjectId(userId) })
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                Translation_1.Translation.countDocuments({ userId: new mongoose_1.Types.ObjectId(userId) }),
            ]);
            const totalPages = Math.ceil(totalCount / limit);
            return {
                translations: translations.map((t) => this.mapTranslationToResponse(t)),
                totalCount,
                currentPage: page,
                totalPages,
            };
        }
        catch (error) {
            logger_1.logger.error("Error fetching user translations:", error);
            throw new Error("Failed to fetch translations");
        }
    }
    async searchTranslations(userId, searchOptions) {
        try {
            const { query, tone, tags, dateFrom, dateTo, isFavorite, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", } = searchOptions;
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
            // Build search filter
            const filter = { userId: new mongoose_1.Types.ObjectId(userId) };
            if (query) {
                filter.$or = [
                    { originalText: { $regex: query, $options: "i" } },
                    { translatedText: { $regex: query, $options: "i" } },
                ];
            }
            if (tone) {
                filter.tone = tone;
            }
            if (tags && tags.length > 0) {
                filter.tags = { $in: tags };
            }
            if (dateFrom || dateTo) {
                filter.createdAt = {};
                if (dateFrom)
                    filter.createdAt.$gte = dateFrom;
                if (dateTo)
                    filter.createdAt.$lte = dateTo;
            }
            if (typeof isFavorite === "boolean") {
                filter.isFavorite = isFavorite;
            }
            const [translations, totalCount] = await Promise.all([
                Translation_1.Translation.find(filter).sort(sort).skip(skip).limit(limit).exec(),
                Translation_1.Translation.countDocuments(filter),
            ]);
            const totalPages = Math.ceil(totalCount / limit);
            return {
                translations: translations.map((t) => this.mapTranslationToResponse(t)),
                totalCount,
                currentPage: page,
                totalPages,
            };
        }
        catch (error) {
            logger_1.logger.error("Error searching translations:", error);
            throw new Error("Failed to search translations");
        }
    }
    async toggleFavorite(id, userId) {
        try {
            const translation = await Translation_1.Translation.findOne({
                _id: new mongoose_1.Types.ObjectId(id),
                userId: new mongoose_1.Types.ObjectId(userId),
            });
            if (!translation) {
                throw new Error("Translation not found");
            }
            translation.isFavorite = !translation.isFavorite;
            const updatedTranslation = await translation.save();
            logger_1.logger.info("Translation favorite toggled", {
                translationId: id,
                userId,
                isFavorite: updatedTranslation.isFavorite,
            });
            return this.mapTranslationToResponse(updatedTranslation);
        }
        catch (error) {
            logger_1.logger.error("Error toggling favorite:", error);
            throw new Error("Failed to toggle favorite status");
        }
    }
    async deleteTranslation(id, userId) {
        try {
            const result = await Translation_1.Translation.deleteOne({
                _id: new mongoose_1.Types.ObjectId(id),
                userId: new mongoose_1.Types.ObjectId(userId),
            });
            if (result.deletedCount === 0) {
                return false;
            }
            // Also remove from translation history
            await TranslationHistory_1.TranslationHistory.deleteMany({
                userId: new mongoose_1.Types.ObjectId(userId),
                translationId: new mongoose_1.Types.ObjectId(id),
            });
            logger_1.logger.info("Translation deleted", { translationId: id, userId });
            return true;
        }
        catch (error) {
            logger_1.logger.error("Error deleting translation:", error);
            throw new Error("Failed to delete translation");
        }
    }
    async addTagsToTranslation(id, userId, newTags) {
        try {
            const translation = await Translation_1.Translation.findOne({
                _id: new mongoose_1.Types.ObjectId(id),
                userId: new mongoose_1.Types.ObjectId(userId),
            });
            if (!translation) {
                throw new Error("Translation not found");
            }
            // Filter and add new unique tags
            const filteredTags = newTags
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0 && !translation.tags.includes(tag));
            if (filteredTags.length === 0) {
                return this.mapTranslationToResponse(translation);
            }
            translation.tags.push(...filteredTags);
            const updatedTranslation = await translation.save();
            logger_1.logger.info("Tags added to translation", {
                translationId: id,
                userId,
                newTags: filteredTags,
            });
            return this.mapTranslationToResponse(updatedTranslation);
        }
        catch (error) {
            logger_1.logger.error("Error adding tags:", error);
            throw new Error("Failed to add tags");
        }
    }
    async getFavoriteTranslations(userId, options) {
        try {
            const searchOptions = {
                ...options,
                isFavorite: true,
            };
            return await this.searchTranslations(userId, searchOptions);
        }
        catch (error) {
            logger_1.logger.error("Error fetching favorite translations:", error);
            throw new Error("Failed to fetch favorite translations");
        }
    }
    async getUserStats(userId) {
        try {
            const userObjectId = new mongoose_1.Types.ObjectId(userId);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const [totalTranslations, favoriteTranslations, toneStats, languageStats, recentTranslationsCount,] = await Promise.all([
                Translation_1.Translation.countDocuments({ userId: userObjectId }),
                Translation_1.Translation.countDocuments({ userId: userObjectId, isFavorite: true }),
                Translation_1.Translation.aggregate([
                    { $match: { userId: userObjectId } },
                    { $group: { _id: "$tone", count: { $sum: 1 } } },
                ]),
                Translation_1.Translation.aggregate([
                    { $match: { userId: userObjectId } },
                    { $group: { _id: "$originalLanguage", count: { $sum: 1 } } },
                ]),
                Translation_1.Translation.countDocuments({
                    userId: userObjectId,
                    createdAt: { $gte: thirtyDaysAgo },
                }),
            ]);
            const translationsByTone = {};
            toneStats.forEach((stat) => {
                translationsByTone[stat._id] = stat.count;
            });
            const translationsByLanguage = {};
            languageStats.forEach((stat) => {
                translationsByLanguage[stat._id] = stat.count;
            });
            return {
                totalTranslations,
                favoriteTranslations,
                translationsByTone,
                translationsByLanguage,
                recentTranslationsCount,
            };
        }
        catch (error) {
            logger_1.logger.error("Error fetching user stats:", error);
            throw new Error("Failed to fetch user statistics");
        }
    }
    async recordTranslationHistory(userId, translationId) {
        try {
            const historyEntry = new TranslationHistory_1.TranslationHistory({
                userId: new mongoose_1.Types.ObjectId(userId),
                translationId: new mongoose_1.Types.ObjectId(translationId),
                accessedAt: new Date(),
            });
            await historyEntry.save();
        }
        catch (error) {
            logger_1.logger.warn("Failed to record translation history:", error);
            // Non-critical error, don't throw
        }
    }
    mapTranslationToResponse(translation) {
        return {
            id: translation._id.toString(),
            originalText: translation.originalText,
            translatedText: translation.translatedText,
            tone: translation.tone,
            originalLanguage: translation.originalLanguage,
            createdAt: translation.createdAt,
            isFavorite: translation.isFavorite,
            tags: translation.tags || [],
        };
    }
}
exports.TranslationService = TranslationService;
//# sourceMappingURL=translationService.js.map