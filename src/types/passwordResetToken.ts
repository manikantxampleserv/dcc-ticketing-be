import jwt from "jsonwebtoken";

const RESET_SECRET = process.env.JWT_SECRET!;

export function generateResetToken(user: { id: number; email: string }) {
  return jwt.sign(
    {
      uid: user.id,
      email: user.email,
      type: "password_reset",
    },
    RESET_SECRET,
    { expiresIn: "15m" }
  );
}

export function verifyResetToken(token: string) {
  return jwt.verify(token, RESET_SECRET) as {
    uid: number;
    email: string;
    type: string;
  };
}
