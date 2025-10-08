"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSLAValidation = exports.createSLAValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createSLAValidation = [
    (0, express_validator_1.body)("priority")
        .trim()
        .notEmpty()
        .withMessage("Priority is required")
        .isString()
        .withMessage("Priority must be a string")
        .isLength({ max: 20 })
        .withMessage("Priority must be at most 20 characters long"),
    (0, express_validator_1.body)("response_time_hours")
        .notEmpty()
        .withMessage("Response time (hours) is required")
        .isInt({ min: 0 })
        .withMessage("Response time must be a positive integer"),
    (0, express_validator_1.body)("resolution_time_hours")
        .notEmpty()
        .withMessage("Resolution time (hours) is required")
        .isInt({ min: 0 })
        .withMessage("Resolution time must be a positive integer"),
    (0, express_validator_1.body)("business_hours_only")
        .optional()
        .isBoolean()
        .withMessage("Business hours only must be a boolean"),
    (0, express_validator_1.body)("business_start_time")
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .withMessage("Business start time must be in HH:MM:SS format"),
    (0, express_validator_1.body)("business_end_time")
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .withMessage("Business end time must be in HH:MM:SS format"),
    (0, express_validator_1.body)("include_weekends")
        .optional()
        .isBoolean()
        .withMessage("Include weekends must be a boolean"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("Is active must be a boolean"),
];
exports.updateSLAValidation = [
    (0, express_validator_1.body)("priority")
        .trim()
        .notEmpty()
        .withMessage("Priority is required")
        .isString()
        .withMessage("Priority must be a string")
        .isLength({ max: 20 })
        .withMessage("Priority must be at most 20 characters long"),
    (0, express_validator_1.body)("response_time_hours")
        .notEmpty()
        .withMessage("Response time (hours) is required")
        .isInt({ min: 0 })
        .withMessage("Response time must be a positive integer"),
    (0, express_validator_1.body)("resolution_time_hours")
        .notEmpty()
        .withMessage("Resolution time (hours) is required")
        .isInt({ min: 0 })
        .withMessage("Resolution time must be a positive integer"),
    (0, express_validator_1.body)("business_hours_only")
        .optional()
        .isBoolean()
        .withMessage("Business hours only must be a boolean"),
    (0, express_validator_1.body)("business_start_time")
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .withMessage("Business start time must be in HH:MM:SS format"),
    (0, express_validator_1.body)("business_end_time")
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .withMessage("Business end time must be in HH:MM:SS format"),
    (0, express_validator_1.body)("include_weekends")
        .optional()
        .isBoolean()
        .withMessage("Include weekends must be a boolean"),
    (0, express_validator_1.body)("is_active")
        .optional()
        .isBoolean()
        .withMessage("Is active must be a boolean"),
];
