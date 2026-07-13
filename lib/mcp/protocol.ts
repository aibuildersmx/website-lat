import { randomUUID } from "node:crypto";
import { MCP_READ_SCOPE, MCP_WRITE_SCOPE, hasScope, type McpActor } from "./auth";
import {
  recordMcpAudit,
  withinMcpMutationRateLimit,
  type McpRequestMetadata,
} from "./audit";
import {
  createNewsletterDraft,
  DraftConflictError,
  getNewsletterDraft,
  listNewsletterDrafts,
  updateNewsletterDraft,
} from "./newsletters";
import { newsletterIssueJsonSchema, parseIssue } from "@/lib/newsletter/validation";

type JsonRpcId = string | number | null;
type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: Record<string, unknown> }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

type RecordValue = Record<string, unknown>;

export const MCP_SERVER_NAME = "ai-builders-newsletters";
export const MCP_PROTOCOL_VERSION = "2025-06-18";

export const NEWSLETTER_MCP_TOOLS = [
  {
    name: "list_newsletter_drafts",
    title: "List newsletter drafts",
    description: "List recent AI Builders newsletter drafts. Sent or sending newsletters are never returned.",
    scope: MCP_READ_SCOPE,
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      additionalProperties: false,
    },
  },
  {
    name: "get_newsletter_draft",
    title: "Get a newsletter draft",
    description: "Read a newsletter draft and its revision for safe editing.",
    scope: MCP_READ_SCOPE,
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", format: "uuid" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_newsletter_draft",
    title: "Create a newsletter draft",
    description: "Create a new draft. This tool cannot publish or send it. Omit issue to start from the standard empty template.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", maxLength: 2_000 },
        issue: newsletterIssueJsonSchema,
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_newsletter_draft",
    title: "Update a newsletter draft",
    description: "Replace structured content for a draft at an expected revision. Fails if it was published, sent, or edited since it was read.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        expected_revision: { type: "integer", minimum: 1 },
        issue: newsletterIssueJsonSchema,
      },
      required: ["id", "expected_revision", "issue"],
      additionalProperties: false,
    },
  },
] as const;

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function onlyKeys(value: RecordValue, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function uuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function error(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function success(id: JsonRpcId, result: Record<string, unknown>): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function toolResult(value: unknown, isError = false): Record<string, unknown> {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : { structuredContent: isRecord(value) ? value : { value } }),
  };
}

function validArguments(value: unknown, keys: readonly string[]): value is RecordValue {
  return isRecord(value) && onlyKeys(value, keys);
}

async function invokeTool(name: string, args: unknown, actor: McpActor) {
  const tool = NEWSLETTER_MCP_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) return { protocolError: error(null, -32602, "Unknown tool.") };
  if (!hasScope(actor, tool.scope)) return { result: toolResult("This credential does not have the required scope.", true), errorCode: "forbidden" };

  if (name === "list_newsletter_drafts") {
    const input = args ?? {};
    if (!validArguments(input, ["limit"])) return { result: toolResult("Invalid arguments.", true), errorCode: "invalid_arguments" };
    const limit = input.limit === undefined ? 20 : input.limit;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 50) {
      return { result: toolResult("limit must be an integer from 1 to 50.", true), errorCode: "invalid_arguments" };
    }
    return { result: toolResult({ drafts: await listNewsletterDrafts(Number(limit)) }) };
  }

  if (name === "get_newsletter_draft") {
    if (!validArguments(args, ["id"]) || !uuid(args.id)) return { result: toolResult("id must be a UUID.", true), errorCode: "invalid_arguments" };
    const draft = await getNewsletterDraft(args.id);
    if (!draft) return { result: toolResult("Draft not found. It may already have been sent or published.", true), errorCode: "not_found" };
    return { result: toolResult(draft), newsletterId: args.id };
  }

  if (name === "create_newsletter_draft") {
    const input = args ?? {};
    if (!validArguments(input, ["subject", "issue"])) return { result: toolResult("Invalid arguments.", true), errorCode: "invalid_arguments" };
    if (input.subject !== undefined && (typeof input.subject !== "string" || input.subject.length > 2_000)) {
      return { result: toolResult("subject must be a string no longer than 2,000 characters.", true), errorCode: "invalid_arguments" };
    }
    const issue = input.issue === undefined ? undefined : parseIssue(input.issue);
    if (input.issue !== undefined && !issue) return { result: toolResult("issue does not match the newsletter data model.", true), errorCode: "invalid_arguments" };
    const draft = await createNewsletterDraft(issue ?? undefined, input.subject as string | undefined);
    return { result: toolResult(draft), newsletterId: draft.id };
  }

  if (name === "update_newsletter_draft") {
    if (!validArguments(args, ["id", "expected_revision", "issue"]) || !uuid(args.id)) {
      return { result: toolResult("id, expected_revision, and issue are required.", true), errorCode: "invalid_arguments" };
    }
    if (!Number.isInteger(args.expected_revision) || Number(args.expected_revision) < 1) {
      return { result: toolResult("expected_revision must be a positive integer.", true), errorCode: "invalid_arguments" };
    }
    const issue = parseIssue(args.issue);
    if (!issue) return { result: toolResult("issue does not match the newsletter data model.", true), errorCode: "invalid_arguments" };
    try {
      const draft = await updateNewsletterDraft(args.id, Number(args.expected_revision), issue);
      return { result: toolResult(draft), newsletterId: args.id };
    } catch (cause) {
      if (cause instanceof DraftConflictError) {
        return { result: toolResult("The draft is missing, no longer editable, or has a newer revision. Read it again before retrying.", true), errorCode: cause.code };
      }
      throw cause;
    }
  }

  return { protocolError: error(null, -32602, "Unknown tool.") };
}

export async function handleMcpRequest(
  message: unknown,
  actor: McpActor,
  metadata: McpRequestMetadata = { requestId: randomUUID(), ipHash: null, userAgent: null },
): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || !onlyKeys(message, ["jsonrpc", "id", "method", "params"])) {
    return error(null, -32600, "Invalid Request.");
  }
  const id = message.id;
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return error(null, -32600, "Invalid Request.");
  }
  if (id !== undefined && id !== null && typeof id !== "string" && typeof id !== "number") {
    return error(null, -32600, "Invalid Request.");
  }

  if (message.method === "notifications/initialized") return null;
  // Notifications never receive JSON-RPC responses. Tool calls are ignored
  // without an id so a malformed notification cannot mutate newsletter data.
  if (id === undefined) return null;
  const responseId = (id ?? null) as JsonRpcId;

  if (message.method === "initialize") {
    if (!isRecord(message.params)) return error(responseId, -32602, "Invalid initialize parameters.");
    const requested = message.params.protocolVersion;
    const supported = ["2025-03-26", "2025-06-18", "2025-11-25"];
    return success(responseId, {
      protocolVersion: typeof requested === "string" && supported.includes(requested)
        ? requested
        : MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: MCP_SERVER_NAME, version: "1.0.0" },
      instructions: "Use these tools only for AI Builders newsletter drafts. Publishing, sending, and deletion are intentionally unavailable.",
    });
  }

  if (message.method === "ping") return success(responseId, {});

  if (message.method === "tools/list") {
    const tools = NEWSLETTER_MCP_TOOLS
      .filter((tool) => hasScope(actor, tool.scope))
      .map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    return success(responseId, { tools });
  }

  if (message.method !== "tools/call") return error(responseId, -32601, "Method not found.");
  if (!isRecord(message.params) || !onlyKeys(message.params, ["name", "arguments"]) || typeof message.params.name !== "string") {
    return error(responseId, -32602, "Invalid tool call parameters.");
  }

  const operation = message.params.name.slice(0, 100);
  const started = performance.now();
  if (!(await withinMcpMutationRateLimit(actor, operation))) {
    await recordMcpAudit({ actor, metadata, operation, outcome: "denied", errorCode: "rate_limited", durationMs: performance.now() - started });
    return success(responseId, toolResult("Rate limit exceeded. Try again in one minute.", true));
  }

  try {
    const invoked = await invokeTool(message.params.name, message.params.arguments ?? {}, actor);
    if (invoked.protocolError) {
      await recordMcpAudit({ actor, metadata, operation, outcome: "denied", errorCode: "unknown_tool", durationMs: performance.now() - started });
      return { ...invoked.protocolError, id: responseId };
    }
    await recordMcpAudit({
      actor,
      metadata,
      operation,
      newsletterId: invoked.newsletterId,
      outcome: invoked.errorCode ? "error" : "success",
      errorCode: invoked.errorCode,
      durationMs: performance.now() - started,
    });
    return success(responseId, invoked.result);
  } catch {
    await recordMcpAudit({ actor, metadata, operation, outcome: "error", errorCode: "internal", durationMs: performance.now() - started });
    return success(responseId, toolResult("The operation could not be completed.", true));
  }
}
