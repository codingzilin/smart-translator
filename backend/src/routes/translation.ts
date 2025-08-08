// src/routes/translation.ts
import { Router } from "express";
import { TranslationController } from "../controllers/TranslationControllers";
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
  TranslationController.translateText
);

// GET /api/translations - Get user's translation history
router.get("/", TranslationController.getTranslations);

// GET /api/translations/:id - Get specific translation by ID
router.get("/:id", TranslationController.getTranslationById);

// POST /api/translations/:id/favorite - Toggle favorite status
router.post("/:id/favorite", TranslationController.toggleFavorite);

// DELETE /api/translations/:id - Delete a translation
router.delete("/:id", TranslationController.deleteTranslation);

// POST /api/translations/:id/tags - Add tags to translation
router.post("/:id/tags", TranslationController.addTags);

// GET /api/translations/search - Search translations by text or tags
router.get("/search", TranslationController.searchTranslations);

// GET /api/translations/favorites - Get favorite translations
router.get("/favorites", TranslationController.getFavoriteTranslations);

export default router;
