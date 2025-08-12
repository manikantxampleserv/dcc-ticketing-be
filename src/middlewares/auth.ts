import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JWTPayload {
  userId: number;
  name: string;
  email: string;
  role: string;
  employeeId: number;
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
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
