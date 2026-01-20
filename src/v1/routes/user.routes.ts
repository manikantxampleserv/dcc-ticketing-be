import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsersList,
  updateUser,
  updateUserStatus,
} from "../controllers/user.controller";
import { authenticateToken } from "../../middlewares/auth";
import { upload } from "../../utils/multer";
import { verify } from "crypto";
import {
  forgotPassword,
  resetPassword,
  resetPasswordWithOtp,
  verifyResetOtp,
} from "v1/controllers/forgetPassword";
import { body } from "express-validator";
const routes = Router();

routes.post("/users", authenticateToken, upload.single("avatar"), createUser);

routes.get("/users", authenticateToken, (req, res) => getUsersList(req, res));

routes.get("/users/:id", authenticateToken, (req, res) => getUser(req, res));

routes.put(
  "/users/:id",
  authenticateToken,
  upload.single("avatar"),
  updateUser
);

routes.delete("/users", authenticateToken, deleteUser);
routes.patch("/users/status/:id", authenticateToken, (req, res) =>
  updateUserStatus(req, res)
);

routes.post("/forgot-password", body("email").isEmail(), forgotPassword);

routes.post(
  "/reset-password/:token",
  body("password").isLength({ min: 8 }),
  resetPassword
);

// OTP flow
routes.post(
  "/forgot-password/verify-otp",
  body("email").isEmail(),
  verifyResetOtp
);
routes.post(
  "/forgot-password/reset-with-otp",
  body("email").isEmail(),
  resetPasswordWithOtp
);

export default routes;
