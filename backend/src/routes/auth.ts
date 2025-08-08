// src/routes/auth.ts
import { Router } from "express";
import { AuthController } from "../controllers/AuthControllers";
import { validateRegistration, validateLogin } from "../middleware/validation";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /api/auth/register - User registration
router.post("/register", validateRegistration, AuthController.register);

// POST /api/auth/login - User login
router.post("/login", validateLogin, AuthController.login);

// POST /api/auth/logout - User logout
router.post("/logout", authMiddleware, AuthController.logout);

// GET /api/auth/me - Get current user profile
router.get("/me", authMiddleware, AuthController.getCurrentUser);

export default router;
