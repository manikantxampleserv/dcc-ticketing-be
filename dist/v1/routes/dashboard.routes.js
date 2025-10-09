"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../middlewares/auth");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/getTicketStatus", auth_1.authenticateToken, dashboard_controller_1.dashboardController.getTicketStatus);
exports.default = router;
