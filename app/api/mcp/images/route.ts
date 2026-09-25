import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { claimMcpRateLimit, recordMcpAudit } from "@/lib/mcp/audit";
import { authenticateMcpToken, hasScope, MCP_WRITE_SCOPE } from "@/lib/mcp/auth";
import { bearerToken, hashIp } from "@/lib/mcp/tokens";
import { ImageUploadError, imageMarkdown, readUpload, storeImage } from "@/lib/newsletter/images";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plain HTTP upload for agents with a shell: MCP tool calls can't carry a
// multi-MB file, but `curl -F file=@foto.jpg` can. Same bearer token as /api/mcp.
const HEADERS = { "Cache-Control": "no-store" };

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`mcp-auth:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: HEADERS });
  }
  const rawToken = bearerToken(request.headers.get("authorization"));
  const actor = rawToken ? await authenticateMcpToken(rawToken) : null;
  if (!actor) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { ...HEADERS, "WWW-Authenticate": "Bearer" } });
  if (!hasScope(actor, MCP_WRITE_SCOPE)) {
    return NextResponse.json({ error: "This credential cannot upload images." }, { status: 403, headers: HEADERS });
  }

  const operation = "upload_newsletter_image";
  const metadata = {
    requestId: request.headers.get("x-request-id")?.slice(0, 100) || randomUUID(),
    ipHash: ip === "unknown" ? null : hashIp(ip),
    userAgent: request.headers.get("user-agent"),
  };
  const started = performance.now();
  if (!(await claimMcpRateLimit(`token:${actor.tokenId}:images`, 20))) {
    await recordMcpAudit({ actor, metadata, operation, outcome: "denied", errorCode: "rate_limited", durationMs: performance.now() - started });
    return NextResponse.json({ error: "Rate limit exceeded. Try again in one minute." }, { status: 429, headers: HEADERS });
  }

  try {
    const image = await storeImage(await readUpload(request), { tokenId: actor.tokenId });
    await recordMcpAudit({ actor, metadata, operation, outcome: "success", durationMs: performance.now() - started });
    return NextResponse.json({ ...image, markdown: imageMarkdown(image.url) }, { headers: HEADERS });
  } catch (cause) {
    if (cause instanceof ImageUploadError) {
      await recordMcpAudit({ actor, metadata, operation, outcome: "error", errorCode: cause.code, durationMs: performance.now() - started });
      return NextResponse.json({ error: cause.message }, { status: cause.code === "too_large" ? 413 : 400, headers: HEADERS });
    }
    throw cause;
  }
}
