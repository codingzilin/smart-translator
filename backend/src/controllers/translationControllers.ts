import { Request, Response } from "express";
import { Translation } from "../models/Translation";
import { TranslationHistory } from "../models/TranslationHistory";
import { OpenAIService } from "../services/openaiService";
import { logger } from "../utils/logger";

// Type definitions
interface AuthRequest extends Request {
  user?: any;
}

interface TranslateBody {
  text: string;
  tone: "natural" | "gentle" | "cute" | "depressed" | "angry";
  tags?: string[];
}

interface GetTranslationsQuery {
  page?: string;
  limit?: string;
  tone?: string;
  search?: string;
  favorites?: string;
}

export class TranslationController {
  private static openaiService = new OpenAIService();

  // Execute translation
  static async translate(req: AuthRequest, res: Response) {
    try {
      const { text, tone, tags = [] } = req.body as TranslateBody;
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
      const translatedText =
        await TranslationController.openaiService.translate(text, tone);

      if (!translatedText) {
        return res.status(500).json({
          success: false,
          message: "Translation failed, please try again",
        });
      }

      // Save translation record
      const translation = new Translation({
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
      const history = new TranslationHistory({
        userId,
        translationId: translation._id,
        accessedAt: new Date(),
      });

      await history.save();

      logger.info(
        `Translation successful - User: ${userId}, Tone: ${tone}, Original length: ${text.length}`
      );

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
    } catch (error) {
      logger.error("Translation failed:", error);

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
  static async getTranslations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.userId;
      const {
        page = "1",
        limit = "20",
        tone,
        search,
        favorites,
      } = req.query as GetTranslationsQuery;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query conditions
      const query: any = { userId };

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
      const translations = await Translation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-__v");

      // Get total count
      const total = await Translation.countDocuments(query);

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
    } catch (error) {
      logger.error("Failed to get translation history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get translation history",
      });
    }
  }

  // Get single translation record
  static async getTranslation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const translation = await Translation.findOne({
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
      await TranslationHistory.findOneAndUpdate(
        { userId, translationId: id },
        { accessedAt: new Date() },
        { upsert: true }
      );

      res.json({
        success: true,
        data: {
          translation,
        },
      });
    } catch (error) {
      logger.error("Failed to get translation record:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get translation record",
      });
    }
  }

  // Toggle favorite status
  static async toggleFavorite(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const translation = await Translation.findOne({
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

      logger.info(
        `User ${userId} ${
          translation.isFavorite ? "favorited" : "unfavorited"
        } translation record ${id}`
      );

      res.json({
        success: true,
        message: translation.isFavorite
          ? "Added to favorites"
          : "Removed from favorites",
        data: {
          isFavorite: translation.isFavorite,
        },
      });
    } catch (error) {
      logger.error("Failed to toggle favorite status:", error);
      res.status(500).json({
        success: false,
        message: "Operation failed",
      });
    }
  }

  // Delete translation record
  static async deleteTranslation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const translation = await Translation.findOne({
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
      await Translation.findByIdAndDelete(id);

      // Delete related history records
      await TranslationHistory.deleteMany({
        translationId: id,
      });

      logger.info(`User ${userId} deleted translation record ${id}`);

      res.json({
        success: true,
        message: "Delete successful",
      });
    } catch (error) {
      logger.error("Failed to delete translation record:", error);
      res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }

  // Batch delete translation records
  static async deleteTranslations(req: AuthRequest, res: Response) {
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
      const translations = await Translation.find({
        _id: { $in: ids },
        userId,
      });

      if (translations.length !== ids.length) {
        return res.status(400).json({
          success: false,
          message:
            "Some records do not exist or you don't have permission to delete them",
        });
      }

      // Delete translation records
      await Translation.deleteMany({
        _id: { $in: ids },
        userId,
      });

      // Delete related history records
      await TranslationHistory.deleteMany({
        translationId: { $in: ids },
      });

      logger.info(
        `User ${userId} batch deleted translation records: ${ids.join(", ")}`
      );

      res.json({
        success: true,
        message: `Successfully deleted ${ids.length} records`,
      });
    } catch (error) {
      logger.error("Failed to batch delete translation records:", error);
      res.status(500).json({
        success: false,
        message: "Delete failed",
      });
    }
  }

  // Get translation statistics
  static async getStatistics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.userId;

      // Get total translations count
      const totalTranslations = await Translation.countDocuments({ userId });

      // Get favorites count
      const favoriteCount = await Translation.countDocuments({
        userId,
        isFavorite: true,
      });

      // Get tone usage statistics
      const toneStats = await Translation.aggregate([
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

      const dailyStats = await Translation.aggregate([
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
    } catch (error) {
      logger.error("Failed to get translation statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get statistics",
      });
    }
  }

  // Simple language detection function
  private static detectLanguage(text: string): string {
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
