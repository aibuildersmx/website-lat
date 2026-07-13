import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { mcpAuditLog, mcpRateLimits } from "@/lib/db/schema";
import type { McpActor } from "./auth";

export interface McpRequestMetadata {
  requestId: string;
  ipHash: string | null;
  userAgent: string | null;
}

export async function claimMcpRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const now = new Date();
    const [current] = await tx
      .select()
      .from(mcpRateLimits)
      .where(eq(mcpRateLimits.key, key))
      .limit(1);

    if (!current || current.windowStartedAt.getTime() + windowMs <= now.getTime()) {
      await tx
        .insert(mcpRateLimits)
        .values({ key, windowStartedAt: now, count: 1, updatedAt: now })
        .onConflictDoUpdate({
          target: mcpRateLimits.key,
          set: { windowStartedAt: now, count: 1, updatedAt: now },
        });
      return true;
    }
    if (current.count >= limit) return false;
    await tx
      .update(mcpRateLimits)
      .set({ count: current.count + 1, updatedAt: now })
      .where(eq(mcpRateLimits.key, key));
    return true;
  });
}

export async function withinMcpMutationRateLimit(
  actor: McpActor,
  operation: string,
): Promise<boolean> {
  if (operation === "create_newsletter_draft") {
    return claimMcpRateLimit(`token:${actor.tokenId}:create`, 10);
  }
  if (operation === "update_newsletter_draft") {
    return claimMcpRateLimit(`token:${actor.tokenId}:update`, 30);
  }
  return true;
}

export async function recordMcpAudit(input: {
  actor: McpActor;
  metadata: McpRequestMetadata;
  operation: string;
  newsletterId?: string;
  outcome: "success" | "error" | "denied";
  errorCode?: string;
  durationMs: number;
}): Promise<void> {
  await db.insert(mcpAuditLog).values({
    userId: input.actor.userId,
    tokenId: input.actor.tokenId,
    requestId: input.metadata.requestId,
    operation: input.operation.slice(0, 100),
    newsletterId: input.newsletterId,
    outcome: input.outcome,
    errorCode: input.errorCode?.slice(0, 100),
    ipHash: input.metadata.ipHash,
    userAgent: input.metadata.userAgent?.slice(0, 500),
    durationMs: Math.max(0, Math.round(input.durationMs)),
  });
}
