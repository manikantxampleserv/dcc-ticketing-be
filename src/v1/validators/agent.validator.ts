// validators/agentValidator.ts
import { body, param } from "express-validator";

export const createAgentValidator = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 100 })
    .withMessage("First name must be at most 100 characters"),

  body("last_name")
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage("Last name must be at most 100 characters"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email"),

  body("phone")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Phone must be at most 50 characters"),

  body("role")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Role must be at most 50 characters"),

  body("department")
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage("Department must be at most 100 characters"),

  body("hire_date")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("hire_date must be a valid ISO 8601 date"),

  body("user_id").optional().isInt().withMessage("user_id must be an integer"),
];

export const updateAgentValidator = [
  // Allow partial updates — all fields optional
  body("first_name")
    .optional()
    .isLength({ max: 100 })
    .withMessage("First name must be at most 100 characters"),

  body("last_name")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Last name must be at most 100 characters"),

  body("email").optional().isEmail().withMessage("Must be a valid email"),

  body("phone").optional().isLength({ max: 50 }),

  body("role").optional().isString().isLength({ max: 50 }),

  body("department").optional().isString().isLength({ max: 100 }),

  body("is_active").optional().isBoolean(),

  body("hire_date").optional().isISO8601().toDate(),

  body("avatar").optional().isString().isLength({ max: 500 }),

  body("user_id").optional().isInt(),
];

export const deleteAgentValidator = [
  param("id")
    .notEmpty()
    .withMessage("Agent ID is required")
    .isInt()
    .withMessage("Agent ID must be an integer"),
];
