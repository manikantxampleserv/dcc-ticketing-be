import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsersList,
  updateUser,
} from "../controllers/user.controller";
import { authenticateToken } from "../../middlewares/auth";

const routes = Router();

routes.post("/users", authenticateToken, (req, res) => createUser(req, res));
routes.get("/users", authenticateToken, (req, res) => getUsersList(req, res));
routes.get("/users/:id", authenticateToken, (req, res) => getUser(req, res));
routes.put("/users/:id", authenticateToken, (req, res) => updateUser(req, res));
routes.delete("/users/:id", authenticateToken, (req, res) =>
  deleteUser(req, res)
);

export default routes;
