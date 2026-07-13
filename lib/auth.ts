import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AdminTokenPayload {
  id: string;
  email: string;
  name: string;
}

export function signAdminToken(payload: AdminTokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}
