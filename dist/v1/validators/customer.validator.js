"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomerValidation = exports.createCustomerValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createCustomerValidation = [
    (0, express_validator_1.body)("company_id")
        .notEmpty()
        .withMessage("Company ID is required")
        .isInt({ min: 1 })
        .withMessage("Company ID must be a positive integer"),
    (0, express_validator_1.body)("first_name")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ max: 100 })
        .withMessage("First name must not exceed 100 characters"),
    (0, express_validator_1.body)("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required")
        .isLength({ max: 255 })
        .withMessage("Last name must not exceed 255 characters"),
    (0, express_validator_1.body)("phone")
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage("Phone must not exceed 50 characters"),
    (0, express_validator_1.body)("job_title")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Job title must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
];
exports.updateCustomerValidation = [
    (0, express_validator_1.body)("company_id")
        .notEmpty()
        .withMessage("Company ID is required")
        .isInt({ min: 1 })
        .withMessage("Company ID must be a positive integer"),
    (0, express_validator_1.body)("first_name")
        .trim()
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ max: 100 })
        .withMessage("First name must not exceed 100 characters"),
    (0, express_validator_1.body)("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required")
        .isLength({ max: 255 })
        .withMessage("Last name must not exceed 255 characters"),
    (0, express_validator_1.body)("phone")
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage("Phone must not exceed 50 characters"),
    (0, express_validator_1.body)("job_title")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Job title must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
];
