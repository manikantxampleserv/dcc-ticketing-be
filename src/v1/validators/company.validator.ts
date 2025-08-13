import { body, param } from "express-validator";

export const createCompanyValidation = [
  body("company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ max: 255 })
    .withMessage("Company name must not exceed 255 characters"),

  body("domain")
    .trim()
    .notEmpty()
    .withMessage("Domain is required")
    .isLength({ max: 100 })
    .withMessage("Domain must not exceed 100 characters")
    .matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage("Domain must be a valid format"),

  body("contact_email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Contact email must be valid")
    .isLength({ max: 255 })
    .withMessage("Contact email must not exceed 255 characters"),

  body("contact_phone")
    .optional({ checkFalsy: true })
    .isLength({ max: 50 })
    .withMessage("Contact phone must not exceed 50 characters")
    .matches(/^[0-9+\-() ]*$/)
    .withMessage("Contact phone contains invalid characters"),

  body("address")
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean value"),
];

export const updateCompanyValidation = [
  param("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
  body("company_name")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ max: 100 })
    .withMessage("Company name must not exceed 100 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),
];

export const getCompanyByIdValidation = [
  param("id").isInt({ gt: 0 }).withMessage("ID must be a positive integer"),
];
