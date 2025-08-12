import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JWTPayload {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "access_token_missing" });
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "token_expired" });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "invalid_token" });
    } else {
      res.status(401).json({ error: "token_verification_failed" });
    }
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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

export function authorizeDepartment(...allowedDepartments: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "authentication_required" });
      return;
    }

    if (
      !req.user.department ||
      !allowedDepartments.includes(req.user.department)
    ) {
      res.status(403).json({
        error: "access_denied",
        message: `required_department: ${allowedDepartments.join(" or ")}`,
      });
      return;
    }

    next();
  };
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  authorizeRoles("admin")(req, res, next);
}

export function requireManagerOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  authorizeRoles("manager", "admin")(req, res, next);
}

export function requireSelfOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "authentication_required" });
    return;
  }

  const targetUserId = parseInt(req.params.id);
  const isOwnProfile = req.user.user_id === targetUserId;
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
