"use strict";
/**
 * Authentication routes
 *
 * Handles user registration, login, and profile retrieval.
 *
 * @module routes/auth
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_1.Router)();
/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/auth/register", auth_controller_1.register);
/**
 * @route POST /auth/login
 * @desc Login user and return JWT
 * @access Public
 */
router.post("/auth/login", auth_controller_1.login);
/**
 * @route GET /auth/me
 * @desc Get current user's profile
 * @access Private
 */
router.get("/auth/me", auth_1.authenticateToken, auth_controller_1.getProfile);
exports.default = router;
