"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSearchQuery = exports.validateObjectId = exports.validatePagination = exports.validatePasswordChange = exports.validateUserUpdate = exports.validateTranslation = exports.validateLogin = exports.validateRegistration = void 0;
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => ({
            field: error.type === "field" ? error.path : "unknown",
            message: error.msg,
            value: error.type === "field" ? error.value : undefined,
        }));
        logger_1.logger.warn("Validation failed:", errorMessages);
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
exports.validateRegistration = [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    (0, express_validator_1.body)("username")
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Username must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8, max: 128 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character"),
    (0, express_validator_1.body)("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Password confirmation does not match password");
        }
        return true;
    }),
    handleValidationErrors,
];
// User login validation
exports.validateLogin = [
    (0, express_validator_1.body)("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors,
];
// Translation validation
exports.validateTranslation = [
    (0, express_validator_1.body)("text")
        .notEmpty()
        .isLength({ min: 1, max: 5000 })
        .withMessage("Text must be between 1 and 5000 characters"),
    (0, express_validator_1.body)("tone")
        .isIn(["natural", "gentle", "cute", "depressed", "angry"])
        .withMessage("Tone must be one of: natural, gentle, cute, depressed, angry"),
    (0, express_validator_1.body)("originalLanguage")
        .optional()
        .isLength({ min: 2, max: 10 })
        .withMessage("Original language code must be 2-10 characters"),
    (0, express_validator_1.body)("tags").optional().isArray().withMessage("Tags must be an array"),
    (0, express_validator_1.body)("tags.*")
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage("Each tag must be 1-50 characters long"),
    handleValidationErrors,
];
// User profile update validation
exports.validateUserUpdate = [
    (0, express_validator_1.body)("username")
        .optional()
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Username must be 3-30 characters long and contain only letters, numbers, hyphens, and underscores"),
    (0, express_validator_1.body)("email")
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    (0, express_validator_1.body)("preferences.defaultTone")
        .optional()
        .isIn(["natural", "gentle", "cute", "depressed", "angry"])
        .withMessage("Default tone must be one of: natural, gentle, cute, depressed, angry"),
    (0, express_validator_1.body)("preferences.language")
        .optional()
        .isLength({ min: 2, max: 10 })
        .withMessage("Language code must be 2-10 characters"),
    handleValidationErrors,
];
// Password change validation
exports.validatePasswordChange = [
    (0, express_validator_1.body)("currentPassword")
        .notEmpty()
        .withMessage("Current password is required"),
    (0, express_validator_1.body)("newPassword")
        .isLength({ min: 8, max: 128 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("New password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character"),
    (0, express_validator_1.body)("confirmNewPassword").custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error("New password confirmation does not match new password");
        }
        return true;
    }),
    handleValidationErrors,
];
// Query parameter validation for pagination
const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;
    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
        res.status(400).json({
            success: false,
            message: "Page must be a positive number",
        });
        return;
    }
    if (limit &&
        (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
        res.status(400).json({
            success: false,
            message: "Limit must be a number between 1 and 100",
        });
        return;
    }
    next();
};
exports.validatePagination = validatePagination;
// Generic ID validation middleware
const validateObjectId = (req, res, next) => {
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
exports.validateObjectId = validateObjectId;
// Search query validation
exports.validateSearchQuery = [
    (0, express_validator_1.body)("query")
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage("Search query must be 1-500 characters"),
    (0, express_validator_1.body)("tags").optional().isArray().withMessage("Tags must be an array"),
    (0, express_validator_1.body)("tone")
        .optional()
        .isIn(["natural", "gentle", "cute", "depressed", "angry"])
        .withMessage("Tone filter must be one of: natural, gentle, cute, depressed, angry"),
    (0, express_validator_1.body)("dateFrom")
        .optional()
        .isISO8601()
        .withMessage("Date from must be a valid ISO 8601 date"),
    (0, express_validator_1.body)("dateTo")
        .optional()
        .isISO8601()
        .withMessage("Date to must be a valid ISO 8601 date"),
    handleValidationErrors,
];
//# sourceMappingURL=validation.js.map