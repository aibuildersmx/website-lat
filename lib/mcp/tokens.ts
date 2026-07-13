import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "aibl_mcp_v1_";

export function generateMcpToken(): { raw: string; hash: string; displayPrefix: string } {
  const raw = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    raw,
    hash: hashMcpToken(raw),
    displayPrefix: `${raw.slice(0, TOKEN_PREFIX.length + 6)}…${raw.slice(-4)}`,
  };
}

export function hashMcpToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer ([^\s,]+)$/.exec(header);
  return match?.[1] ?? null;
}

export function hashIp(value: string): string {
  const salt = process.env.MCP_IP_HASH_SALT ?? process.env.AUTH_SECRET ?? "aibl-mcp-ip";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
