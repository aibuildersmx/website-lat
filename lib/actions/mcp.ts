"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { mcpApiTokens } from "@/lib/db/schema";
import { DEFAULT_MCP_SCOPES } from "@/lib/mcp/auth";
import { generateMcpToken } from "@/lib/mcp/tokens";

const MCP_PATH = "/admin/mcp";
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1_000;

export interface CreateMcpTokenState {
  error?: string;
  token?: string;
  tokenName?: string;
}

export interface McpTokenSummary {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export async function listMcpTokens(): Promise<McpTokenSummary[]> {
  const user = await getUser();
  if (!user) return [];
  const rows = await db
    .select()
    .from(mcpApiTokens)
    .where(eq(mcpApiTokens.userId, user.id))
    .orderBy(desc(mcpApiTokens.createdAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    scopes: row.scopes,
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createMcpToken(
  _previous: CreateMcpTokenState,
  formData: FormData,
): Promise<CreateMcpTokenState> {
  const user = await getUser();
  if (!user) return { error: "No autorizado." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 80) return { error: "Usa un nombre de hasta 80 caracteres." };

  const token = generateMcpToken();
  await db.insert(mcpApiTokens).values({
    userId: user.id,
    name,
    tokenHash: token.hash,
    tokenPrefix: token.displayPrefix,
    scopes: [...DEFAULT_MCP_SCOPES],
    expiresAt: new Date(Date.now() + NINETY_DAYS_MS),
  });
  revalidatePath(MCP_PATH);
  return { token: token.raw, tokenName: name };
}

export async function revokeMcpToken(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db
    .update(mcpApiTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(mcpApiTokens.id, id),
        eq(mcpApiTokens.userId, user.id),
      ),
    );
  revalidatePath(MCP_PATH);
}
