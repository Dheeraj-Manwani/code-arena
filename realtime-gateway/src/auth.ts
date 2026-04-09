import jwt from "jsonwebtoken";

interface TokenClaims {
  userId: number;
  role: string;
}

export function verifyToken(token: string): TokenClaims | null {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded !== "object") {
      return null;
    }

    const record = decoded as Record<string, unknown>;
    const sub = record.sub;
    const role = record.role;
    const userId = typeof sub === "string" ? Number.parseInt(sub, 10) : sub;

    if (typeof userId !== "number" || Number.isNaN(userId) || typeof role !== "string") {
      return null;
    }

    return { userId, role };
  } catch {
    return null;
  }
}
