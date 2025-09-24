// validators/ticketValidator.ts
import { body } from "express-validator";

export const createTicketValidator = [
  body("first_name").notEmpty().withMessage("First name  is required"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  body("priority")
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be one of: low, medium, high"),

  body("email").optional().isEmail().withMessage("Email must be valid"),
];
