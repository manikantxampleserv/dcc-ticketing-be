import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsersList,
  updateUser,
} from "../controllers/user.controller";
import { authenticateToken } from "../../middlewares/auth";
import { upload } from "../../utils/multer";
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

routes.delete("/users", authenticateToken, (req, res) => deleteUser(req, res));

export default routes;
