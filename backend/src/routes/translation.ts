// src/routes/translation.ts
import { Router } from "express";
import { TranslationController } from "../controllers/translationControllers";
import { authMiddleware } from "../middleware/auth";
import { validateTranslation } from "../middleware/validation";
import { rateLimit } from "../middleware/rateLimit";

const router = Router();

// Apply authentication middleware to all translation routes
router.use(authMiddleware);

// POST /api/translate - Translate text with specified tone
router.post(
  "/",
  rateLimit, // Rate limiting for translation requests
  validateTranslation,
  TranslationController.translate
);

// GET /api/translations - Get user's translation history
router.get("/", TranslationController.getTranslations);

// GET /api/translations/:id - Get specific translation by ID
router.get("/:id", TranslationController.getTranslation);

// POST /api/translations/:id/favorite - Toggle favorite status
router.post("/:id/favorite", TranslationController.toggleFavorite);

// DELETE /api/translations/:id - Delete a translation
router.delete("/:id", TranslationController.deleteTranslation);

// Note: addTags, searchTranslations, and getFavoriteTranslations methods
// are not implemented in TranslationController yet
// TODO: Implement these methods in TranslationController

export default router;
