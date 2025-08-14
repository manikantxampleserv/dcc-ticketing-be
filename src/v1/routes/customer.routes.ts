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
  "/customers",
  authenticateToken,
  createCustomerValidation,
  validate,
  customerController.createCustomer
);
router.get(
  "/customers/:id",
  authenticateToken,
  customerController.getCustomerById
);

router.get("/customers", authenticateToken, customerController.getAllCustomer);

router.put(
  "/customers/:id",
  authenticateToken,
  updateCustomerValidation,
  validate,
  customerController.updateCustomer
);

router.delete(
  "/customers/:id",
  authenticateToken,
  customerController.deleteCustomer
);

export default router;
