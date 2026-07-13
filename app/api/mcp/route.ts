import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateMcpToken } from "@/lib/mcp/auth";
import { handleMcpRequest } from "@/lib/mcp/protocol";
import { bearerToken, hashIp } from "@/lib/mcp/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { claimMcpRateLimit } from "@/lib/mcp/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 256_000;
const MCP_HEADERS = {
  "Cache-Control": "no-store",
};
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-03-26", "2025-06-18", "2025-11-25"]);

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? "unknown";
}

function validOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const allowed = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
  if (configured) {
    try { allowed.add(new URL(configured).origin); } catch { /* invalid env is not an allowed origin */ }
  }
  return allowed.has(origin);
}

function rpcError(status: number, code: number, message: string, extraHeaders?: HeadersInit) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers: { ...MCP_HEADERS, ...extraHeaders } },
  );
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return rpcError(403, -32600, "Forbidden origin.");

  const ip = clientIp(request);
  if (!rateLimit(`mcp-auth:${ip}`, 30, 60_000)) {
    return rpcError(429, -32000, "Too many requests.", { "Retry-After": "60" });
  }

  const rawToken = bearerToken(request.headers.get("authorization"));
  const actor = rawToken ? await authenticateMcpToken(rawToken) : null;
  if (!actor) {
    return rpcError(401, -32001, "Unauthorized.", { "WWW-Authenticate": "Bearer" });
  }
  if (!(await claimMcpRateLimit(`token:${actor.tokenId}:all`, 120))) {
    return rpcError(429, -32000, "Too many requests.", { "Retry-After": "60" });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return rpcError(415, -32600, "Content-Type must be application/json.");
  }
  const accept = request.headers.get("accept");
  if (accept && !accept.includes("application/json") && !accept.includes("*/*")) {
    return rpcError(406, -32600, "Client must accept application/json.");
  }
  const protocolVersion = request.headers.get("mcp-protocol-version");
  if (protocolVersion && !SUPPORTED_PROTOCOL_VERSIONS.has(protocolVersion)) {
    return rpcError(400, -32600, "Unsupported MCP protocol version.");
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_CHARS) return rpcError(413, -32600, "Request body is too large.");

  const body = await request.text();
  if (body.length > MAX_BODY_CHARS) return rpcError(413, -32600, "Request body is too large.");
  let message: unknown;
  try {
    message = JSON.parse(body);
  } catch {
    return rpcError(400, -32700, "Parse error.");
  }
  if (Array.isArray(message)) return rpcError(400, -32600, "Batch requests are not supported.");

  const response = await handleMcpRequest(message, actor, {
    requestId: request.headers.get("x-request-id")?.slice(0, 100) || randomUUID(),
    ipHash: ip === "unknown" ? null : hashIp(ip),
    userAgent: request.headers.get("user-agent"),
  });
  if (!response) return new NextResponse(null, { status: 202, headers: MCP_HEADERS });
  return NextResponse.json(response, { headers: MCP_HEADERS });
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { ...MCP_HEADERS, Allow: "POST" } });
}

export function DELETE() {
  return new NextResponse(null, { status: 405, headers: { ...MCP_HEADERS, Allow: "POST" } });
}
