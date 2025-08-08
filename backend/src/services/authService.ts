// src/services/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { logger } from "../utils/logger";
import { Types } from "mongoose";

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    createdAt: Date;
    preferences: {
      defaultTone: string;
      language: string;
    };
  };
  token: string;
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  preferences: {
    defaultTone: string;
    language: string;
  };
}

export class AuthService {
  private readonly saltRounds = 12;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn = "7d"; // 7 days

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "";
    if (!this.jwtSecret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }
  }

  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    try {
      const { email, username, password } = registerData;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error("User with this email already exists");
        }
        if (existingUser.username === username) {
          throw new Error("Username is already taken");
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.saltRounds);

      // Create new user
      const user = new User({
        email,
        username,
        passwordHash,
        createdAt: new Date(),
        lastLoginAt: null,
        preferences: {
          defaultTone: "natural",
          language: "en",
        },
      });

      const savedUser = await user.save();

      // Generate JWT token
      const token = this.generateToken(savedUser);

      // Update last login time
      await User.findByIdAndUpdate(savedUser._id, {
        lastLoginAt: new Date(),
      });

      logger.info("User registered successfully", {
        userId: savedUser._id?.toString() || "",
        email: savedUser.email,
        username: savedUser.username,
      });

      return {
        user: this.mapUserToProfile(savedUser),
        token,
      };
    } catch (error) {
      logger.error("Registration failed:", error as Error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Registration failed");
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      const { email, password } = loginData;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn("Failed login attempt", {
          email,
          userId: user._id?.toString() || "",
        });
        throw new Error("Invalid email or password");
      }

      // Generate JWT token
      const token = this.generateToken(user);

      // Update last login time
      await User.findByIdAndUpdate(user._id, {
        lastLoginAt: new Date(),
      });

      logger.info("User logged in successfully", {
        userId: user._id?.toString() || "",
        email: user.email,
        username: user.username,
      });

      return {
        user: this.mapUserToProfile(user),
        token,
      };
    } catch (error) {
      logger.error("Login failed:", error as Error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Login failed");
    }
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await User.findById(new Types.ObjectId(userId)).select(
        "-passwordHash"
      );

      if (!user) {
        return null;
      }

      return this.mapUserToProfile(user);
    } catch (error) {
      logger.error("Error fetching user by ID:", error as Error);
      throw new Error("Failed to fetch user");
    }
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const user = await User.findOne({ email }).select("-passwordHash");

      if (!user) {
        return null;
      }

      return this.mapUserToProfile(user);
    } catch (error) {
      logger.error("Error fetching user by email:", error as Error);
      throw new Error("Failed to fetch user");
    }
  }

  async updateProfile(
    userId: string,
    updates: {
      username?: string;
      email?: string;
    }
  ): Promise<UserProfile> {
    try {
      const { username, email } = updates;

      // Check if new username/email are already taken (excluding current user)
      if (username || email) {
        const conflictQuery: any = { _id: { $ne: new Types.ObjectId(userId) } };
        const orConditions = [];

        if (username) orConditions.push({ username });
        if (email) orConditions.push({ email });

        if (orConditions.length > 0) {
          conflictQuery.$or = orConditions;

          const existingUser = await User.findOne(conflictQuery);
          if (existingUser) {
            if (existingUser.username === username) {
              throw new Error("Username is already taken");
            }
            if (existingUser.email === email) {
              throw new Error("Email is already registered");
            }
          }
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        new Types.ObjectId(userId),
        { ...updates },
        { new: true }
      ).select("-passwordHash");

      if (!updatedUser) {
        throw new Error("User not found");
      }

      logger.info("User profile updated", {
        userId,
        updates: Object.keys(updates),
      });

      return this.mapUserToProfile(updatedUser);
    } catch (error) {
      logger.error("Error updating user profile:", error as Error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update profile");
    }
  }

  async updatePreferences(
    userId: string,
    preferences: {
      defaultTone?: string;
      language?: string;
    }
  ): Promise<UserProfile> {
    try {
      const validTones = ["natural", "gentle", "cute", "depressed", "angry"];

      if (
        preferences.defaultTone &&
        !validTones.includes(preferences.defaultTone)
      ) {
        throw new Error("Invalid tone preference");
      }

      const updatedUser = await User.findByIdAndUpdate(
        new Types.ObjectId(userId),
        {
          $set: {
            "preferences.defaultTone": preferences.defaultTone,
            "preferences.language": preferences.language,
          },
        },
        { new: true }
      ).select("-passwordHash");

      if (!updatedUser) {
        throw new Error("User not found");
      }

      logger.info("User preferences updated", {
        userId,
        preferences,
      });

      return this.mapUserToProfile(updatedUser);
    } catch (error) {
      logger.error("Error updating user preferences:", error as Error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update preferences");
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Find user with password hash
      const user = await User.findById(new Types.ObjectId(userId));
      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

      // Update user's password
      await User.findByIdAndUpdate(new Types.ObjectId(userId), {
        passwordHash: newPasswordHash,
      });

      logger.info("Password changed successfully", { userId });
    } catch (error) {
      logger.error("Error changing password:", error as Error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to change password");
    }
  }

  private generateToken(user: any): string {
    const payload = {
      userId: user._id,
      email: user.email,
      username: user.username,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });
  }

  private mapUserToProfile(user: any): UserProfile {
    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      preferences: {
        defaultTone: user.preferences?.defaultTone || "natural",
        language: user.preferences?.language || "en",
      },
    };
  }
}
