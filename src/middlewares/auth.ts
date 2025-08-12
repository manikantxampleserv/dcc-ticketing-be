import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
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
    res.status(401).json({ error: "Access token missing" });
    return;
  }

  const JWT_SECRET = process.env.JWT_SECRET || "SUPPORT_SECRET_KEY";

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired" });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(401).json({ error: "Token verification failed" });
    }
  }
}

// Role-based access control middleware
export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Access denied",
        message: `Required role: ${allowedRoles.join(" or ")}`,
      });
      return;
    }

    next();
  };
}

// Department-based access control middleware
export function authorizeDepartment(...allowedDepartments: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (
      !req.user.department ||
      !allowedDepartments.includes(req.user.department)
    ) {
      res.status(403).json({
        error: "Access denied",
        message: `Required department: ${allowedDepartments.join(" or ")}`,
      });
      return;
    }

    next();
  };
}

// Admin-only middleware
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  authorizeRoles("Admin")(req, res, next);
}

// Manager or Admin middleware
export function requireManagerOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  authorizeRoles("Manager", "Admin")(req, res, next);
}

// Self or Admin access middleware (for profile operations)
export function requireSelfOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const targetUserId = parseInt(req.params.id);
  const isOwnProfile = req.user.userId === targetUserId;
  const isAdmin = req.user.role === "Admin";

  if (!isOwnProfile && !isAdmin) {
    res.status(403).json({
      error: "Access denied",
      message: "You can only access your own profile or must be an admin",
    });
    return;
  }

  next();
}
