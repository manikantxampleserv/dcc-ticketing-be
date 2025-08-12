import { authenticateToken } from "middlewares/auth";
import { categoryController } from "../controllers/category.controller";
import { Router } from "express";
import {
  createCategoryValidation,
  updateCategoryValidation,
  getCategoryByIdValidation,
} from "../validators/category.validator";
import { validate } from "middlewares/validate";
const router = Router();

router.post("/category", authenticateToken, categoryController.createCategory);
router.get(
  "/category/:id",
  authenticateToken,
  createCategoryValidation,
  validate,
  categoryController.getCategoryById
);
router.get("/category", authenticateToken, categoryController.getAllCategories);
router.put(
  "/category/:id",
  authenticateToken,
  categoryController.updateCategory
);
router.delete(
  "/category/:id",
  authenticateToken,
  categoryController.deleteCategory
);

export default router;
