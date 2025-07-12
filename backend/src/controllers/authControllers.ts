import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { logger } from "../utils/logger";

interface AuthRequest extends Request {
  user?: any;
}

interface RegisterBody {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export class AuthController {
  // 用户注册
  static async register(req: Request<{}, {}, RegisterBody>, res: Response) {
    try {
      const { email, username, password, confirmPassword } = req.body;

      // Input validation
      if (!email || !username || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Password confirmation does not match",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            existingUser.email === email
              ? "Email is already registered"
              : "Username is already taken",
        });
      }

      // Password encryption
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = new User({
        email,
        username,
        passwordHash,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: {
          defaultTone: "natural",
          language: "zh-CN",
        },
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      logger.info(`New user registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            preferences: user.preferences,
          },
        },
      });
    } catch (error) {
      logger.error("Registration failed:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // User login
  static async login(req: Request<{}, {}, LoginBody>, res: Response) {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      logger.info(`User logged in successfully: ${email}`);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt,
          },
        },
      });
    } catch (error) {
      logger.error("Login failed:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get current user information
  static async me(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId).select("-passwordHash");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            preferences: user.preferences,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          },
        },
      });
    } catch (error) {
      logger.error("Failed to get user information:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // User logout
  static async logout(req: AuthRequest, res: Response) {
    try {
      // In a real application, you can add token blacklist logic here
      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      logger.error("Logout failed:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Change password
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user.userId;

      // Input validation
      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New password confirmation does not match",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(
        oldPassword,
        user.passwordHash
      );
      if (!isOldPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Old password is incorrect",
        });
      }

      // Encrypt new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      user.passwordHash = newPasswordHash;
      await user.save();

      logger.info(`User changed password successfully: ${user.email}`);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Failed to change password:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Refresh token
  static async refreshToken(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.userId;
      const email = req.user.email;

      // Generate new JWT token
      const token = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          token,
        },
      });
    } catch (error) {
      logger.error("Token refresh failed:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
