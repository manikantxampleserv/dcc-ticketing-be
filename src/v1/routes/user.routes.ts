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
const routes = Router();

routes.post("/users", upload.single("avatar"), createUser);

routes.get("/users", authenticateToken, (req, res) => getUsersList(req, res));

routes.get("/users/:id", authenticateToken, (req, res) => getUser(req, res));

routes.put(
  "/users/:id",
  authenticateToken,
  upload.single("avatar"),
  updateUser
);

routes.delete("/users", authenticateToken, (req, res) => deleteUser(req, res));
routes.patch("/users/status/:id", authenticateToken, (req, res) =>
  updateUserStatus(req, res)
);
export default routes;
