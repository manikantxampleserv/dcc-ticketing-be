"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleValidation = exports.createRoleValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createRoleValidation = [
    (0, express_validator_1.body)("name")
        .trim()
        .notEmpty()
        .withMessage("Role name is required")
        .isLength({ max: 100 })
        .withMessage("Role name must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
];
exports.updateRoleValidation = [
    (0, express_validator_1.body)("name")
        .trim()
        .notEmpty()
        .withMessage("Role name is required")
        .isLength({ max: 100 })
        .withMessage("Role name must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
];
