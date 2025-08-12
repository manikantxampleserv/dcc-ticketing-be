/**
 * Authentication routes
 *
 * Handles user registration, login, and profile retrieval.
 *
 * @module routes/auth
 */

import { Router } from "express";
import { login, register, getProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../../middlewares/auth";

const router = Router();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/auth/register", register);

/**
 * @route POST /auth/login
 * @desc Login user and return JWT
 * @access Public
 */
router.post("/auth/login", login);

/**
 * @route GET /auth/me
 * @desc Get current user's profile
 * @access Private
 */
router.get("/auth/me", authenticateToken, getProfile);

export default router;
