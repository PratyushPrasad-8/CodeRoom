import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const secret = process.env.AUTH_SECRET || "coderrooms-development-secret-change-before-production";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function createSession(user) {
  const payload = encode({ sub: user.id, exp: Date.now() + sessionDurationMs });
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio || "",
    verified: Boolean(user.verified),
    verifiedAt: user.verifiedAt || null,
    verificationMethod: user.verificationMethod || null,
    createdAt: user.createdAt
  };
}
