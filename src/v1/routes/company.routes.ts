import { authenticateToken } from "middlewares/auth";
import { companyController } from "../controllers/comapny.controller";
import { Router } from "express";
import { validate } from "middlewares/validate";
import {
  createCompanyValidation,
  getCompanyByIdValidation,
  updateCompanyValidation,
} from "v1/validators/company.validator";

const router = Router();

router.post(
  "/company",
  authenticateToken,
  createCompanyValidation,
  validate,
  companyController.createCompany
);
router.get(
  "/company/:id",
  authenticateToken,
  getCompanyByIdValidation,
  validate,
  companyController.getCompanyById
);
router.get("/company", authenticateToken, companyController.getAllCompany);
router.put(
  "/company/:id",
  authenticateToken,
  updateCompanyValidation,
  validate,
  companyController.updateCompany
);
router.delete(
  "/company/:id",
  authenticateToken,
  companyController.deleteCompany
);
export default router;
