// src/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import { body, validationResult, ValidationChain } from "express-validator";
import { logger } from "../utils/logger";

// Helper function to handle validation results
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.type === "field" ? error.path : "unknown",
      message: error.msg,
      value: error.type === "field" ? error.value : undefined,
    }));

    logger.warn("Validation failed:", errorMessages);

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    });
    return;
  }

  next();
};

// User registration validation
export const validateRegistration: ValidationChain[] = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("username")
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores"
    ),

  body("password")
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password");
    }
    return true;
  }),

  handleValidationErrors,
];

// User login validation
export const validateLogin: ValidationChain[] = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),

  handleValidationErrors,
];

// Translation validation
export const validateTranslation: ValidationChain[] = [
  body("text")
    .notEmpty()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Text must be between 1 and 5000 characters"),

  body("tone")
    .isIn(["natural", "gentle", "cute", "depressed", "angry"])
    .withMessage(
      "Tone must be one of: natural, gentle, cute, depressed, angry"
    ),

  body("originalLanguage")
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage("Original language code must be 2-10 characters"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be 1-50 characters long"),

  handleValidationErrors,
];

// User profile update validation
export const validateUserUpdate: ValidationChain[] = [
  body("username")
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores"
    ),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("preferences.defaultTone")
    .optional()
    .isIn(["natural", "gentle", "cute", "depressed", "angry"])
    .withMessage(
      "Default tone must be one of: natural, gentle, cute, depressed, angry"
    ),

  body("preferences.language")
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage("Language code must be 2-10 characters"),

  handleValidationErrors,
];

// Password change validation
export const validatePasswordChange: ValidationChain[] = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    ),

  body("confirmNewPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("New password confirmation does not match new password");
    }
    return true;
  }),

  handleValidationErrors,
];

// Query parameter validation for pagination
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { page, limit } = req.query;

  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    res.status(400).json({
      success: false,
      message: "Page must be a positive number",
    });
    return;
  }

  if (
    limit &&
    (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)
  ) {
    res.status(400).json({
      success: false,
      message: "Limit must be a number between 1 and 100",
    });
    return;
  }

  next();
};

// Generic ID validation middleware
export const validateObjectId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;

  // MongoDB ObjectId validation (24 character hex string)
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
    return;
  }

  next();
};

// Search query validation
export const validateSearchQuery: ValidationChain[] = [
  body("query")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("Search query must be 1-500 characters"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tone")
    .optional()
    .isIn(["natural", "gentle", "cute", "depressed", "angry"])
    .withMessage(
      "Tone filter must be one of: natural, gentle, cute, depressed, angry"
    ),

  body("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Date from must be a valid ISO 8601 date"),

  body("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Date to must be a valid ISO 8601 date"),

  handleValidationErrors,
];
