import crypto from "node:crypto";

const KEY_LENGTH = 64;
const SESSION_DAYS = 7;

const scrypt = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, KEY_LENGTH, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });

export const hashPassword = async (password) => {
  if (typeof password !== "string" || password.length < 6 || password.length > 200) {
    throw Object.assign(new Error("Mật khẩu phải có từ 6 đến 200 ký tự."), { status: 400 });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
};

export const verifyPassword = async (password, storedHash) => {
  const [algorithm, salt, expectedHex] = String(storedHash || "").split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = await scrypt(password, salt);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const createSession = (userId, now = new Date()) => {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    document: {
      id: `ses_${crypto.randomUUID()}`,
      userId: String(userId),
      tokenHash: hashToken(token),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_DAYS * 86400000),
    },
  };
};

export const publicUser = (user) => {
  if (!user) return null;
  const { _id, password, passwordHash, ...safe } = user;
  return { ...safe, id: String(safe.id ?? _id) };
};

export const normalizeRole = (role) =>
  ["admin", "warehouse", "support", "user"].includes(role) ? role : "user";

export const getBearerToken = (req) => {
  const value = String(req.get("authorization") || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

export const sanitizeAuditValue = (value) => {
  if (!value || typeof value !== "object") return value;
  const blocked = /password|token|secret|hash|authorization/i;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blocked.test(key))
      .map(([key, item]) => [key, typeof item === "object" ? sanitizeAuditValue(item) : item]),
  );
};
