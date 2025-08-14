import { authenticateToken } from "middlewares/auth";
import { roleController } from "../controllers/role.controller";
import { Router } from "express";
import { validate } from "middlewares/validate";
import {
  createRoleValidation,
  updateRoleValidation,
} from "v1/validators/role.validator";

const router = Router();

router.post(
  "/role",
  authenticateToken,
  createRoleValidation,
  validate,
  roleController.createRole
);

router.get("/role/:id", authenticateToken, roleController.getRoleById);

router.get("/role", authenticateToken, roleController.getAllRole);

router.put(
  "/role/:id",
  authenticateToken,
  updateRoleValidation,
  validate,
  roleController.updateRole
);

router.delete("/role/:id", authenticateToken, roleController.deleteRole);

export default router;
