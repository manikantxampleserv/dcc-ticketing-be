// middleware/corsDebug.ts
import { Request, Response, NextFunction } from "express";

export const corsDebugger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const origin = req.headers.origin;

  console.log("📍 CORS Debug:", {
    method: req.method,
    path: req.path,
    origin: origin,
    headers: {
      "access-control-request-method":
        req.headers["access-control-request-method"],
      "access-control-request-headers":
        req.headers["access-control-request-headers"],
    },
  });

  next();
};
