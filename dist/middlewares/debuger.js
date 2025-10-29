"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsDebugger = void 0;
const corsDebugger = (req, res, next) => {
    const origin = req.headers.origin;
    console.log("📍 CORS Debug:", {
        method: req.method,
        path: req.path,
        origin: origin,
        headers: {
            "access-control-request-method": req.headers["access-control-request-method"],
            "access-control-request-headers": req.headers["access-control-request-headers"],
        },
    });
    next();
};
exports.corsDebugger = corsDebugger;
