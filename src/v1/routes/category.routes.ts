import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { categoryController } from "../controllers/category.controller";
import { getCategoryByIdValidation } from "../validators/category.validator";
const router = Router();

router.post("/category", authenticateToken, categoryController.createCategory);
router.get(
  "/category/:id",
  authenticateToken,
  getCategoryByIdValidation,
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
  "/category",
  authenticateToken,
  validate,
  categoryController.deleteCategory
);

export default router;
