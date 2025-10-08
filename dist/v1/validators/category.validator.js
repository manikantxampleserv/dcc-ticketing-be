"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryByIdValidation = exports.updateCategoryValidation = exports.createCategoryValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createCategoryValidation = [
    (0, express_validator_1.body)("category_name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .isLength({ max: 100 })
        .withMessage("Category name must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
];
exports.updateCategoryValidation = [
    (0, express_validator_1.param)("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
    (0, express_validator_1.body)("category_name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Category name must not exceed 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must not exceed 500 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
    (0, express_validator_1.body)("created_at")
        .optional()
        .isISO8601()
        .withMessage("Invalid date format for created_at"),
];
exports.getCategoryByIdValidation = [
    (0, express_validator_1.param)("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
];
