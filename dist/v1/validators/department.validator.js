"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDepartmentValidation = exports.createDepartmentValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createDepartmentValidation = [
    (0, express_validator_1.body)("department_name")
        .trim()
        .notEmpty()
        .withMessage("Department name is required")
        .isLength({ max: 100 })
        .withMessage("Department name must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
];
exports.updateDepartmentValidation = [
    (0, express_validator_1.body)("department_name")
        .trim()
        .notEmpty()
        .withMessage("Department name is required")
        .isLength({ max: 100 })
        .withMessage("Department name must not exceed 100 characters"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be true or false"),
];
