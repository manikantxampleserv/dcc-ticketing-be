"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResetToken = generateResetToken;
exports.verifyResetToken = verifyResetToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const RESET_SECRET = process.env.JWT_SECRET;
function generateResetToken(user) {
    return jsonwebtoken_1.default.sign({
        uid: user.id,
        email: user.email,
        type: "password_reset",
    }, RESET_SECRET, { expiresIn: "15m" });
}
function verifyResetToken(token) {
    return jsonwebtoken_1.default.verify(token, RESET_SECRET);
}
