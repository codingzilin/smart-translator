"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = require("express");
const AuthControllers_1 = require("../controllers/AuthControllers");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/register - User registration
router.post("/register", validation_1.validateRegistration, AuthControllers_1.AuthController.register);
// POST /api/auth/login - User login
router.post("/login", validation_1.validateLogin, AuthControllers_1.AuthController.login);
// POST /api/auth/logout - User logout
router.post("/logout", auth_1.authMiddleware, AuthControllers_1.AuthController.logout);
// GET /api/auth/me - Get current user profile
router.get("/me", auth_1.authMiddleware, AuthControllers_1.AuthController.me);
exports.default = router;
//# sourceMappingURL=auth.js.map