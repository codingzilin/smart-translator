// src/services/translationService.ts
import { Translation } from "../models/Translation";
import { TranslationHistory } from "../models/TranslationHistory";
import { OpenAIService } from "./openaiService";
import { logger } from "../utils/logger";
import { Types } from "mongoose";

interface TranslationRequest {
  text: string;
  tone: string;
  originalLanguage?: string;
  tags?: string[];
  userId: string;
}

interface TranslationResponse {
  id: string;
  originalText: string;
  translatedText: string;
  tone: string;
  originalLanguage: string;
  createdAt: Date;
  isFavorite: boolean;
  tags: string[];
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface SearchOptions extends PaginationOptions {
  query?: string;
  tone?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  isFavorite?: boolean;
}

export class TranslationService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  async createTranslation(
    request: TranslationRequest
  ): Promise<TranslationResponse> {
    try {
      const { text, tone, originalLanguage, tags = [], userId } = request;

      logger.info("Creating translation", {
        userId,
        textLength: text.length,
        tone,
        originalLanguage,
      });

      // Perform translation using OpenAI service
      const translationResult = await this.openaiService.translateWithDetails(
        text,
        tone
      );

      // Create translation record in database
      const translation = new Translation({
        userId: new Types.ObjectId(userId),
        originalText: text,
        originalLanguage:
          originalLanguage || translationResult.detectedLanguage || "unknown",
        translatedText: translationResult.translatedText,
        tone,
        createdAt: new Date(),
        isFavorite: false,
        tags: tags.filter((tag) => tag.trim().length > 0), // Remove empty tags
      });

      const savedTranslation = await translation.save();

      // Record in translation history
      await this.recordTranslationHistory(
        userId,
        savedTranslation._id.toString()
      );

      logger.info("Translation created successfully", {
        translationId: savedTranslation._id,
        userId,
        confidence: translationResult.confidence,
      });

      return this.mapTranslationToResponse(savedTranslation);
    } catch (error) {
      logger.error("Translation creation failed:", error);
      throw new Error(
        `Translation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getTranslationById(
    id: string,
    userId: string
  ): Promise<TranslationResponse | null> {
    try {
      const translation = await Translation.findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      });

      if (!translation) {
        return null;
      }

      // Record access in history
      await this.recordTranslationHistory(userId, id);

      return this.mapTranslationToResponse(translation);
    } catch (error) {
      logger.error("Error fetching translation by ID:", error);
      throw new Error("Failed to fetch translation");
    }
  }

  async getUserTranslations(
    userId: string,
    options: PaginationOptions
  ): Promise<{
    translations: TranslationResponse[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      const [translations, totalCount] = await Promise.all([
        Translation.find({ userId: new Types.ObjectId(userId) })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        Translation.countDocuments({ userId: new Types.ObjectId(userId) }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        translations: translations.map((t) => this.mapTranslationToResponse(t)),
        totalCount,
        currentPage: page,
        totalPages,
      };
    } catch (error) {
      logger.error("Error fetching user translations:", error);
      throw new Error("Failed to fetch translations");
    }
  }

  async searchTranslations(
    userId: string,
    searchOptions: SearchOptions
  ): Promise<{
    translations: TranslationResponse[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const {
        query,
        tone,
        tags,
        dateFrom,
        dateTo,
        isFavorite,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = searchOptions;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      // Build search filter
      const filter: any = { userId: new Types.ObjectId(userId) };

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
        if (dateFrom) filter.createdAt.$gte = dateFrom;
        if (dateTo) filter.createdAt.$lte = dateTo;
      }

      if (typeof isFavorite === "boolean") {
        filter.isFavorite = isFavorite;
      }

      const [translations, totalCount] = await Promise.all([
        Translation.find(filter).sort(sort).skip(skip).limit(limit).exec(),
        Translation.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        translations: translations.map((t) => this.mapTranslationToResponse(t)),
        totalCount,
        currentPage: page,
        totalPages,
      };
    } catch (error) {
      logger.error("Error searching translations:", error);
      throw new Error("Failed to search translations");
    }
  }

  async toggleFavorite(
    id: string,
    userId: string
  ): Promise<TranslationResponse> {
    try {
      const translation = await Translation.findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      });

      if (!translation) {
        throw new Error("Translation not found");
      }

      translation.isFavorite = !translation.isFavorite;
      const updatedTranslation = await translation.save();

      logger.info("Translation favorite toggled", {
        translationId: id,
        userId,
        isFavorite: updatedTranslation.isFavorite,
      });

      return this.mapTranslationToResponse(updatedTranslation);
    } catch (error) {
      logger.error("Error toggling favorite:", error);
      throw new Error("Failed to toggle favorite status");
    }
  }

  async deleteTranslation(id: string, userId: string): Promise<boolean> {
    try {
      const result = await Translation.deleteOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      });

      if (result.deletedCount === 0) {
        return false;
      }

      // Also remove from translation history
      await TranslationHistory.deleteMany({
        userId: new Types.ObjectId(userId),
        translationId: new Types.ObjectId(id),
      });

      logger.info("Translation deleted", { translationId: id, userId });
      return true;
    } catch (error) {
      logger.error("Error deleting translation:", error);
      throw new Error("Failed to delete translation");
    }
  }

  async addTagsToTranslation(
    id: string,
    userId: string,
    newTags: string[]
  ): Promise<TranslationResponse> {
    try {
      const translation = await Translation.findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
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

      logger.info("Tags added to translation", {
        translationId: id,
        userId,
        newTags: filteredTags,
      });

      return this.mapTranslationToResponse(updatedTranslation);
    } catch (error) {
      logger.error("Error adding tags:", error);
      throw new Error("Failed to add tags");
    }
  }

  async getFavoriteTranslations(
    userId: string,
    options: PaginationOptions
  ): Promise<{
    translations: TranslationResponse[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const searchOptions: SearchOptions = {
        ...options,
        isFavorite: true,
      };

      return await this.searchTranslations(userId, searchOptions);
    } catch (error) {
      logger.error("Error fetching favorite translations:", error);
      throw new Error("Failed to fetch favorite translations");
    }
  }

  async getUserStats(userId: string): Promise<{
    totalTranslations: number;
    favoriteTranslations: number;
    translationsByTone: { [tone: string]: number };
    translationsByLanguage: { [language: string]: number };
    recentTranslationsCount: number;
  }> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalTranslations,
        favoriteTranslations,
        toneStats,
        languageStats,
        recentTranslationsCount,
      ] = await Promise.all([
        Translation.countDocuments({ userId: userObjectId }),
        Translation.countDocuments({ userId: userObjectId, isFavorite: true }),
        Translation.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$tone", count: { $sum: 1 } } },
        ]),
        Translation.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$originalLanguage", count: { $sum: 1 } } },
        ]),
        Translation.countDocuments({
          userId: userObjectId,
          createdAt: { $gte: thirtyDaysAgo },
        }),
      ]);

      const translationsByTone: { [tone: string]: number } = {};
      toneStats.forEach((stat) => {
        translationsByTone[stat._id] = stat.count;
      });

      const translationsByLanguage: { [language: string]: number } = {};
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
    } catch (error) {
      logger.error("Error fetching user stats:", error);
      throw new Error("Failed to fetch user statistics");
    }
  }

  private async recordTranslationHistory(
    userId: string,
    translationId: string
  ): Promise<void> {
    try {
      const historyEntry = new TranslationHistory({
        userId: new Types.ObjectId(userId),
        translationId: new Types.ObjectId(translationId),
        accessedAt: new Date(),
      });

      await historyEntry.save();
    } catch (error) {
      logger.warn("Failed to record translation history:", error);
      // Non-critical error, don't throw
    }
  }

  private mapTranslationToResponse(translation: any): TranslationResponse {
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
