import { body, param } from "express-validator";

export const createCustomerValidation = [
  body("company_id")
    .notEmpty()
    .withMessage("Company ID is required")
    .isInt({ min: 1 })
    .withMessage("Company ID must be a positive integer"),

  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 100 })
    .withMessage("First name must not exceed 100 characters"),

  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 255 })
    .withMessage("Last name must not exceed 255 characters"),

  body("phone")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Phone must not exceed 50 characters"),

  body("job_title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Job title must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

export const updateCustomerValidation = [
  body("company_id")
    .notEmpty()
    .withMessage("Company ID is required")
    .isInt({ min: 1 })
    .withMessage("Company ID must be a positive integer"),

  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 100 })
    .withMessage("First name must not exceed 100 characters"),

  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 255 })
    .withMessage("Last name must not exceed 255 characters"),

  body("phone")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Phone must not exceed 50 characters"),

  body("job_title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Job title must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];
