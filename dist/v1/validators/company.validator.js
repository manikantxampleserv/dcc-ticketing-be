"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyByIdValidation = exports.updateCompanyValidation = exports.createCompanyValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createCompanyValidation = [
    (0, express_validator_1.body)("company_name")
        .trim()
        .notEmpty()
        .withMessage("Company name is required")
        .isLength({ max: 255 })
        .withMessage("Company name must not exceed 255 characters"),
    (0, express_validator_1.body)("domain")
        .trim()
        .notEmpty()
        .withMessage("Domain is required")
        .isLength({ max: 100 })
        .withMessage("Domain must not exceed 100 characters")
        .matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
        .withMessage("Domain must be a valid format"),
    (0, express_validator_1.body)("contact_email")
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage("Contact email must be valid")
        .isLength({ max: 255 })
        .withMessage("Contact email must not exceed 255 characters"),
    (0, express_validator_1.body)("contact_phone")
        .optional({ checkFalsy: true })
        .isLength({ max: 50 })
        .withMessage("Contact phone must not exceed 50 characters")
        .matches(/^[0-9+\-() ]*$/)
        .withMessage("Contact phone contains invalid characters"),
    (0, express_validator_1.body)("address")
        .optional({ checkFalsy: true })
        .isLength({ max: 500 })
        .withMessage("Address must not exceed 500 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean value"),
];
exports.updateCompanyValidation = [
    (0, express_validator_1.param)("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
    (0, express_validator_1.body)("company_name")
        .trim()
        .notEmpty()
        .withMessage("Company name is required")
        .isLength({ max: 100 })
        .withMessage("Company name must not exceed 100 characters"),
    (0, express_validator_1.body)("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must not exceed 500 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
];
exports.getCompanyByIdValidation = [
    (0, express_validator_1.param)("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
];
