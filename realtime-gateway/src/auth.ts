import jwt from "jsonwebtoken";

interface TokenClaims {
  userId: number;
  role: string;
  /** JWT `exp` in seconds since epoch; Infinity when the token carries no expiry. */
  exp: number;
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

    // jwt.verify already rejects expired tokens; exp drives the mid-connection
    // re-check (issues.md §8.4). Tokens without exp never expire mid-connection.
    const exp = typeof record.exp === "number" ? record.exp : Number.POSITIVE_INFINITY;

    return { userId, role, exp };
  } catch {
    return null;
  }
}
