"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/translation.ts
const express_1 = require("express");
const TranslationControllers_1 = require("../controllers/TranslationControllers");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
// Apply authentication middleware to all translation routes
router.use(auth_1.authMiddleware);
// POST /api/translate - Translate text with specified tone
router.post("/", rateLimit_1.rateLimit, // Rate limiting for translation requests
validation_1.validateTranslation, TranslationControllers_1.TranslationController.translate);
// GET /api/translations - Get user's translation history
router.get("/", TranslationControllers_1.TranslationController.getTranslations);
// GET /api/translations/:id - Get specific translation by ID
router.get("/:id", TranslationControllers_1.TranslationController.getTranslation);
// POST /api/translations/:id/favorite - Toggle favorite status
router.post("/:id/favorite", TranslationControllers_1.TranslationController.toggleFavorite);
// DELETE /api/translations/:id - Delete a translation
router.delete("/:id", TranslationControllers_1.TranslationController.deleteTranslation);
// Note: addTags, searchTranslations, and getFavoriteTranslations methods
// are not implemented in TranslationController yet
// TODO: Implement these methods in TranslationController
exports.default = router;
//# sourceMappingURL=translation.js.map