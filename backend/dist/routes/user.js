"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/user.ts
const express_1 = require("express");
const UserControllers_1 = require("../controllers/UserControllers");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Apply authentication middleware to all user routes
router.use(auth_1.authMiddleware);
// GET /api/user/profile - Get user profile
router.get("/profile", UserControllers_1.UserController.getProfile);
// PUT /api/user/profile - Update user profile
router.put("/profile", validation_1.validateUserUpdate, UserControllers_1.UserController.updateProfile);
// PUT /api/user/preferences - Update user preferences (tone, language)
router.put("/preferences", UserControllers_1.UserController.updatePreferences);
// GET /api/user/preferences - Get user preferences
router.get("/preferences", UserControllers_1.UserController.getProfile);
// PUT /api/user/password - Change password
// Note: changePassword method is in AuthController, not UserController
// TODO: Move this route to auth.ts or implement in UserController
// GET /api/user/stats - Get user statistics (translation count, etc.)
router.get("/stats", UserControllers_1.UserController.getDashboard);
// DELETE /api/user/account - Delete user account
router.delete("/account", UserControllers_1.UserController.deleteAccount);
// GET /api/user/history - Get user's translation history with pagination
router.get("/history", UserControllers_1.UserController.getActivity);
// POST /api/user/export - Export user data
router.post("/export", UserControllers_1.UserController.exportData);
exports.default = router;
//# sourceMappingURL=user.js.map