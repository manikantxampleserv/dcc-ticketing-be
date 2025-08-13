import { authenticateToken } from "middlewares/auth";
import { customerController } from "../controllers/customer.controller";
import { Router } from "express";
import { validate } from "middlewares/validate";
import {
  createCustomerValidation,
  updateCustomerValidation,
} from "v1/validators/customer.validator";

const router = Router();

router.post(
  "/customer",
  authenticateToken,
  createCustomerValidation,
  validate,
  customerController.createCustomer
);
router.get(
  "/customer/:id",
  authenticateToken,
  customerController.getCustomerById
);

router.get("/customer", authenticateToken, customerController.getAllCustomer);

router.put(
  "/customer/:id",
  authenticateToken,
  updateCustomerValidation,
  validate,
  customerController.updateCustomer
);

router.delete(
  "/customer/:id",
  authenticateToken,
  customerController.deleteCustomer
);

export default router;
