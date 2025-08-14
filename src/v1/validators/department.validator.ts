import { body, param } from "express-validator";

export const createDepartmentValidation = [
  body("department_name")
    .trim()
    .notEmpty()
    .withMessage("Department name is required")
    .isLength({ max: 100 })
    .withMessage("Department name must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),
];

export const updateDepartmentValidation = [
  body("department_name")
    .trim()
    .notEmpty()
    .withMessage("Department name is required")
    .isLength({ max: 100 })
    .withMessage("Department name must not exceed 100 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),
];
