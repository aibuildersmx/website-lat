import { randomBytes, createHash } from "node:crypto";

/** Raw token stored in the cookie (never persisted in the DB). */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 of the token; this is what we persist and look up by. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
