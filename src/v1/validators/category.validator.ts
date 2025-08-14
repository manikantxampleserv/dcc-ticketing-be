import { body, param } from "express-validator";

export const createCategoryValidation = [
  body("category_name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 100 })
    .withMessage("Category name must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),
];

export const updateCategoryValidation = [
  param("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),

  body("category_name")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Category name must not exceed 100 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("created_at")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format for created_at"),
];

export const getCategoryByIdValidation = [
  param("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
];
