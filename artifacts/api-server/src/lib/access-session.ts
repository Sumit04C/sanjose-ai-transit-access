import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export const ACCESS_COOKIE_NAME = "transit_report_access";
export const ACCESS_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export type AppAccessConfig = {
  passcode: string;
  sessionSecret: string;
};

export function getAppAccessConfig(): AppAccessConfig | null {
  const passcode = process.env.TRANSIT_REPORT_PASSCODE;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!passcode || !/^[0-9]{4}$/.test(passcode) || !sessionSecret) {
    return null;
  }

  return { passcode, sessionSecret };
}

function signExpiry(expiresAt: number, sessionSecret: string): Buffer {
  return createHmac("sha256", sessionSecret)
    .update(String(expiresAt))
    .digest();
}

export function createAccessCookieValue(
  expiresAt: number,
  sessionSecret: string,
): string {
  const signature = signExpiry(expiresAt, sessionSecret).toString("base64url");
  return `${expiresAt}.${signature}`;
}

export function hasValidAccessCookie(
  cookieValue: unknown,
  sessionSecret: string,
  now = Date.now(),
): boolean {
  if (typeof cookieValue !== "string") return false;

  const [expiryText, signatureText, extra] = cookieValue.split(".");
  if (!expiryText || !signatureText || extra !== undefined) return false;

  const expiresAt = Number(expiryText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;

  const suppliedSignature = Buffer.from(signatureText, "base64url");
  const expectedSignature = signExpiry(expiresAt, sessionSecret);
  if (suppliedSignature.length !== expectedSignature.length) return false;

  return timingSafeEqual(suppliedSignature, expectedSignature);
}

export const requireAppAccess: RequestHandler = (req, res, next) => {
  if (req.path === "/healthz") {
    next();
    return;
  }

  const config = getAppAccessConfig();
  if (!config) {
    res.status(503).json({ error: "App access is not configured." });
    return;
  }

  if (hasValidAccessCookie(req.cookies?.[ACCESS_COOKIE_NAME], config.sessionSecret)) {
    next();
    return;
  }

  res.status(401).json({ error: "Enter the app access code to continue." });
};