import { body, param } from "express-validator";

export const createRoleValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Role name is required")
    .isLength({ max: 100 })
    .withMessage("Role name must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),
];

export const updateRoleValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Role name is required")
    .isLength({ max: 100 })
    .withMessage("Role name must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),
];
