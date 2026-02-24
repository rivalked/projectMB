import type { Request, Response, NextFunction } from "express";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { createDb } from "./db";
import { createRefreshStore } from "./refreshStore";

type JwtUserPayload = {
  id: string;
  email: string;
  role: string;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REFRESH_COOKIE_NAME = "refresh_token";

const JWT_SECRET = process.env.SESSION_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;

if (!JWT_SECRET) {
  console.error("CRITICAL: SESSION_SECRET environment variable is required but not set!");
  process.exit(1);
}

// Allow-list for refresh tokens (DB-backed when DATABASE_URL is set)
const db = process.env.DATABASE_URL ? createDb() : undefined;
const refreshStore = createRefreshStore(db);

export function generateAccessToken(user: JwtUserPayload) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET as string,
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  );
}

export function generateRefreshToken(user: JwtUserPayload) {
  const jti = randomUUID();
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, jti },
    REFRESH_SECRET as string,
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
  );
  // persist allowlist entry
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  void refreshStore.add(jti, user.id, expiresAt);
  return { token, jti };
}

export function revokeRefreshToken(jti: string | undefined) {
  if (jti) void refreshStore.revoke(jti);
}

export function setRefreshCookie(res: Response, token: string) {
  const isProd = res.app.get("env") === "production";
  const serialized = cookie.serialize(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
  res.setHeader("Set-Cookie", serialized);
}

export function clearRefreshCookie(res: Response) {
  const serialized = cookie.serialize(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: res.app.get("env") === "production",
    sameSite: res.app.get("env") === "production" ? "strict" : "lax",
    path: "/api/auth",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", serialized);
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtUserPayload;
}

export function verifyRefreshToken(token: string): (JwtUserPayload & { jti?: string }) {
  return jwt.verify(token, REFRESH_SECRET as string) as JwtUserPayload & { jti?: string };
}

export async function isRefreshJtiValid(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  return refreshStore.isValid(jti);
}

export function authenticateAccess(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access token required" });
  try {
    const user = verifyAccessToken(token);
    (req as any).user = user;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
}

export function readRefreshCookie(req: Request): string | null {
  const header = req.headers["cookie"];
  if (!header) return null;
  const parsed = cookie.parse(header);
  return parsed[REFRESH_COOKIE_NAME] || null;
}

export function rotateRefreshToken(oldJti: string | undefined, user: JwtUserPayload) {
  if (oldJti) revokeRefreshToken(oldJti);
  const { token, jti } = generateRefreshToken(user);
  return { token, jti };
}

export function getAccessTokenTtlSeconds() {
  return ACCESS_TOKEN_TTL_SECONDS;
}


