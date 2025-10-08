"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.authorizeRoles = authorizeRoles;
exports.authorizeDepartment = authorizeDepartment;
exports.requireAdmin = requireAdmin;
exports.requireManagerOrAdmin = requireManagerOrAdmin;
exports.requireSelfOrAdmin = requireSelfOrAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "access_token_missing" });
        return;
    }
    const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ error: "token_expired" });
        }
        else if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ error: "invalid_token" });
        }
        else {
            res.status(401).json({ error: "token_verification_failed" });
        }
    }
}
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: "authentication_required" });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: "access_denied",
                message: `required_role: ${allowedRoles.join(" or ")}`,
            });
            return;
        }
        next();
    };
}
function authorizeDepartment(...allowedDepartments) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: "authentication_required" });
            return;
        }
        if (!req.user.department ||
            !allowedDepartments.includes(req.user.department)) {
            res.status(403).json({
                error: "access_denied",
                message: `required_department: ${allowedDepartments.join(" or ")}`,
            });
            return;
        }
        next();
    };
}
function requireAdmin(req, res, next) {
    authorizeRoles("admin")(req, res, next);
}
function requireManagerOrAdmin(req, res, next) {
    authorizeRoles("manager", "admin")(req, res, next);
}
function requireSelfOrAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: "authentication_required" });
        return;
    }
    const targetUserId = parseInt(req.params.id);
    const isOwnProfile = req.user.id === targetUserId;
    const isAdmin = req.user.role === "admin";
    if (!isOwnProfile && !isAdmin) {
        res.status(403).json({
            error: "access_denied",
            message: "you_can_only_access_your_own_profile_or_must_be_admin",
        });
        return;
    }
    next();
}
