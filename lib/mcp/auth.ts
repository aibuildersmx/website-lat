import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mcpApiTokens, users } from "@/lib/db/schema";
import { hashMcpToken } from "./tokens";

export const MCP_READ_SCOPE = "newsletter:drafts:read";
export const MCP_WRITE_SCOPE = "newsletter:drafts:write";
export const MCP_PREVIEW_SCOPE = "newsletter:preview";
// Sends one real standalone email to one address. Never part of the default
// preset: an admin opts in per token.
export const MCP_SEND_SINGLE_SCOPE = "newsletter:send:single";
export const DEFAULT_MCP_SCOPES = [MCP_READ_SCOPE, MCP_WRITE_SCOPE, MCP_PREVIEW_SCOPE] as const;
export const PREVIEW_ONLY_MCP_SCOPES = [MCP_PREVIEW_SCOPE] as const;
export const SENDER_MCP_SCOPES = [...DEFAULT_MCP_SCOPES, MCP_SEND_SINGLE_SCOPE] as const;

export interface McpActor {
  userId: string;
  tokenId: string;
  scopes: string[];
}

export async function authenticateMcpToken(rawToken: string): Promise<McpActor | null> {
  const [row] = await db
    .select({
      userId: users.id,
      tokenId: mcpApiTokens.id,
      scopes: mcpApiTokens.scopes,
      lastUsedAt: mcpApiTokens.lastUsedAt,
    })
    .from(mcpApiTokens)
    .innerJoin(users, eq(mcpApiTokens.userId, users.id))
    .where(
      and(
        eq(mcpApiTokens.tokenHash, hashMcpToken(rawToken)),
        isNull(mcpApiTokens.revokedAt),
        gt(mcpApiTokens.expiresAt, new Date()),
        eq(users.role, "admin"),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Coarse activity tracking avoids turning every tool discovery request into
  // a mandatory write while still giving admins useful credential visibility.
  if (!row.lastUsedAt || row.lastUsedAt.getTime() < Date.now() - 5 * 60_000) {
    await db
      .update(mcpApiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(mcpApiTokens.id, row.tokenId));
  }

  return { userId: row.userId, tokenId: row.tokenId, scopes: row.scopes };
}

export function hasScope(actor: McpActor, scope: string): boolean {
  return actor.scopes.includes(scope);
}
