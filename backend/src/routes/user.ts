// src/routes/user.ts
import { Router } from "express";
import { UserController } from "../controllers/userControllers";
import { authMiddleware } from "../middleware/auth";
import {
  validateUserUpdate,
  validatePasswordChange,
} from "../middleware/validation";

const router = Router();

// Apply authentication middleware to all user routes
router.use(authMiddleware);

// GET /api/user/profile - Get user profile
router.get("/profile", UserController.getProfile);

// PUT /api/user/profile - Update user profile
router.put("/profile", validateUserUpdate, UserController.updateProfile);

// PUT /api/user/preferences - Update user preferences (tone, language)
router.put("/preferences", UserController.updatePreferences);

// GET /api/user/preferences - Get user preferences
router.get("/preferences", UserController.getProfile);

// PUT /api/user/password - Change password
// Note: changePassword method is in AuthController, not UserController
// TODO: Move this route to auth.ts or implement in UserController

// GET /api/user/stats - Get user statistics (translation count, etc.)
router.get("/stats", UserController.getDashboard);

// DELETE /api/user/account - Delete user account
router.delete("/account", UserController.deleteAccount);

// GET /api/user/history - Get user's translation history with pagination
router.get("/history", UserController.getActivity);

// POST /api/user/export - Export user data
router.post("/export", UserController.exportData);

export default router;
