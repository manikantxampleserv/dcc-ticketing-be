import { authenticateToken } from "middlewares/auth";
import { departmentController } from "../controllers/department.controller";
import { Router } from "express";
import { validate } from "middlewares/validate";
import {
  createDepartmentValidation,
  updateDepartmentValidation,
} from "v1/validators/department.validator";

const router = Router();

router.post(
  "/department",
  authenticateToken,
  createDepartmentValidation,
  validate,
  departmentController.createDepartment
);

router.get(
  "/department/:id",
  authenticateToken,
  departmentController.getDepartmentById
);

router.get(
  "/department",
  authenticateToken,
  departmentController.getAllDepartment
);

router.put(
  "/department/:id",
  authenticateToken,
  updateDepartmentValidation,
  validate,
  departmentController.updateDepartment
);

router.delete(
  "/department/:id",
  authenticateToken,
  departmentController.deleteDepartment
);

export default router;
