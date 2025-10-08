"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAgentValidator = exports.updateAgentValidator = exports.createAgentValidator = void 0;
// validators/agentValidator.ts
const express_validator_1 = require("express-validator");
exports.createAgentValidator = [
    (0, express_validator_1.body)("first_name")
        .notEmpty()
        .withMessage("First name is required")
        .isLength({ max: 100 })
        .withMessage("First name must be at most 100 characters"),
    (0, express_validator_1.body)("last_name")
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage("Last name must be at most 100 characters"),
    (0, express_validator_1.body)("email")
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Must be a valid email"),
    (0, express_validator_1.body)("phone")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Phone must be at most 50 characters"),
    (0, express_validator_1.body)("role")
        .optional()
        .isString()
        .isLength({ max: 50 })
        .withMessage("Role must be at most 50 characters"),
    (0, express_validator_1.body)("department")
        .optional()
        .isString()
        .isLength({ max: 100 })
        .withMessage("Department must be at most 100 characters"),
    (0, express_validator_1.body)("hire_date")
        .optional()
        .isISO8601()
        .toDate()
        .withMessage("hire_date must be a valid ISO 8601 date"),
    (0, express_validator_1.body)("user_id").optional().isInt().withMessage("user_id must be an integer"),
];
exports.updateAgentValidator = [
    // Allow partial updates — all fields optional
    (0, express_validator_1.body)("first_name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("First name must be at most 100 characters"),
    (0, express_validator_1.body)("last_name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Last name must be at most 100 characters"),
    (0, express_validator_1.body)("email").optional().isEmail().withMessage("Must be a valid email"),
    (0, express_validator_1.body)("phone").optional().isLength({ max: 50 }),
    (0, express_validator_1.body)("role").optional().isString().isLength({ max: 50 }),
    (0, express_validator_1.body)("department").optional().isString().isLength({ max: 100 }),
    (0, express_validator_1.body)("is_active").optional().isBoolean(),
    (0, express_validator_1.body)("hire_date").optional().isISO8601().toDate(),
    (0, express_validator_1.body)("avatar").optional().isString().isLength({ max: 500 }),
    (0, express_validator_1.body)("user_id").optional().isInt(),
];
exports.deleteAgentValidator = [
    (0, express_validator_1.param)("id")
        .notEmpty()
        .withMessage("Agent ID is required")
        .isInt()
        .withMessage("Agent ID must be an integer"),
];
