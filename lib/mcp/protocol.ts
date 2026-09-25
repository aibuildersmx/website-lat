import { randomUUID } from "node:crypto";
import { MCP_PREVIEW_SCOPE, MCP_READ_SCOPE, MCP_SEND_SINGLE_SCOPE, MCP_WRITE_SCOPE, hasScope, type McpActor } from "./auth";
import {
  recordMcpAudit,
  withinMcpOperationRateLimit,
  type McpRequestMetadata,
} from "./audit";
import {
  createNewsletterDraft,
  DraftConflictError,
  getNewsletterDraft,
  listNewsletterDrafts,
  setNewsletterAdPlacement,
  updateNewsletterDraft,
} from "./newsletters";
import { isAdPlacement } from "@/lib/newsletter/ad-placement";
import { DirectSendError, sendStandaloneTo } from "@/lib/newsletter/direct-send";
import { newsletterIssueJsonSchema } from "@/lib/newsletter/issue-schema";
import { issueWarnings, previewHtml, standaloneWarnings } from "@/lib/newsletter/preview";
import { emailPreviewHtml } from "@/lib/newsletter/render-email";
import { standaloneEmailJsonSchema } from "@/lib/newsletter/standalone-schema";
import {
  insertStandaloneDraft,
  StandaloneConflictError,
  updateStandaloneDraft,
  WrongEmailKindError,
} from "@/lib/newsletter/standalone-store";
import { EMAIL_KINDS, isEmailKind, type StandaloneEmail } from "@/lib/newsletter/standalone-types";
import { AD_PLACEMENTS, type Issue } from "@/lib/newsletter/types";
import { validateIssue, validateStandalone } from "@/lib/newsletter/validation";

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
    description:
      "List recent AI Builders newsletter drafts. Sent or sending newsletters are never returned. " +
      "Each row has a kind: build_log (The Build Log) or standalone (one-off email). Filter with kind.",
    scope: MCP_READ_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        kind: { type: "string", enum: [...EMAIL_KINDS] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_newsletter_draft",
    title: "Get a newsletter draft",
    description:
      "Read a newsletter draft and its revision for safe editing. " +
      "Returns `issue` for Build Log drafts and `email` for standalone drafts.",
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
  {
    name: "set_newsletter_ad_placement",
    title: "Set newsletter ad placement",
    description: "Move the sponsor slot in a draft without rewriting the issue. Placements are top (after the masthead), after_stories, after_essay, and before_footer. If the chosen section is empty, the slot stays at the top. A Spanish copy is moved to the same place. This cannot publish or send.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        expected_revision: { type: "integer", minimum: 1 },
        placement: { type: "string", enum: [...AD_PLACEMENTS] },
      },
      required: ["id", "expected_revision", "placement"],
      additionalProperties: false,
    },
  },
  {
    name: "preview_newsletter_issue",
    title: "Preview a newsletter issue",
    description:
      "Validate an Issue and render the exact HTML the send would produce (spanish ?? base variant). " +
      "Stateless: reads and writes nothing — safe to call as often as needed while iterating. " +
      "The html field is tens of KB: save it to a file and open it in a browser; never echo it into the conversation.",
    scope: MCP_PREVIEW_SCOPE,
    inputSchema: {
      type: "object",
      properties: { issue: newsletterIssueJsonSchema },
      required: ["issue"],
      additionalProperties: false,
    },
  },
  {
    name: "create_standalone_email",
    title: "Create a standalone email draft",
    description:
      "Create a one-off email to the newsletter list (announcement, invitation) — not The Build Log. " +
      "This tool cannot send it: a human sends it from /admin/newsletter.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: { email: standaloneEmailJsonSchema },
      required: ["email"],
      additionalProperties: false,
    },
  },
  {
    name: "update_standalone_email",
    title: "Update a standalone email draft",
    description:
      "Replace a standalone draft at an expected revision. " +
      "Fails if it is not a standalone draft, was sent, or changed since it was read.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        expected_revision: { type: "integer", minimum: 1 },
        email: standaloneEmailJsonSchema,
      },
      required: ["id", "expected_revision", "email"],
      additionalProperties: false,
    },
  },
  {
    name: "preview_standalone_email",
    title: "Preview a standalone email",
    description:
      "Validate a standalone email and render the exact HTML the send would produce. " +
      "Stateless: reads and writes nothing. " +
      "The html field is large: save it to a file and open it in a browser; never echo it into the conversation.",
    scope: MCP_PREVIEW_SCOPE,
    inputSchema: {
      type: "object",
      properties: { email: standaloneEmailJsonSchema },
      required: ["email"],
      additionalProperties: false,
    },
  },
  {
    name: "send_standalone_email",
    title: "Send a standalone email to one person",
    description:
      "WARNING: sends a REAL email immediately to one address. It cannot be undone. " +
      "Only call it when the user explicitly asked to send this email to this address. " +
      "Only standalone drafts (never The Build Log); the list send stays in /admin/newsletter. " +
      "Each draft reaches the same address at most once. Addresses that unsubscribed are refused. " +
      "Addresses outside the contacts list are sent but come back with a warning: relay it to the user.",
    scope: MCP_SEND_SINGLE_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        to: { type: "string", format: "email", maxLength: 320 },
      },
      required: ["id", "to"],
      additionalProperties: false,
    },
  },
] as const;

// The server owns standalone slugs; authors omit them. A placeholder lets the
// shared validator run, and persistence replaces it.
function standaloneInput(value: RecordValue) {
  return validateStandalone({ ...value, slug: typeof value.slug === "string" ? value.slug : "s-pending0" });
}

function withoutSlug(email: StandaloneEmail): Partial<StandaloneEmail> {
  const content: Partial<StandaloneEmail> = { ...email };
  delete content.slug;
  return content;
}

function wrongKindMessage(cause: WrongEmailKindError): string {
  const tool = cause.actual === "standalone" ? "update_standalone_email" : "update_newsletter_draft";
  return `This draft is a ${cause.actual} email. Use ${tool} (read it with get_newsletter_draft).`;
}

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
    if (!validArguments(input, ["limit", "kind"])) return { result: toolResult("Invalid arguments.", true), errorCode: "invalid_arguments" };
    const limit = input.limit === undefined ? 20 : input.limit;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 50) {
      return { result: toolResult("limit must be an integer from 1 to 50.", true), errorCode: "invalid_arguments" };
    }
    if (input.kind !== undefined && !isEmailKind(input.kind)) {
      return { result: toolResult("kind must be build_log or standalone.", true), errorCode: "invalid_arguments" };
    }
    return { result: toolResult({ drafts: await listNewsletterDrafts(Number(limit), input.kind) }) };
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
    let issue: Issue | undefined;
    if (input.issue !== undefined) {
      const validated = validateIssue(input.issue);
      if (validated.errors) {
        return {
          result: toolResult({ error: "issue no cumple el modelo del newsletter.", details: validated.errors }, true),
          errorCode: "invalid_arguments",
        };
      }
      issue = validated.issue;
    }
    const draft = await createNewsletterDraft(issue, input.subject as string | undefined);
    return { result: toolResult(draft), newsletterId: draft.id };
  }

  if (name === "update_newsletter_draft") {
    if (!validArguments(args, ["id", "expected_revision", "issue"]) || !uuid(args.id)) {
      return { result: toolResult("id, expected_revision, and issue are required.", true), errorCode: "invalid_arguments" };
    }
    if (!Number.isInteger(args.expected_revision) || Number(args.expected_revision) < 1) {
      return { result: toolResult("expected_revision must be a positive integer.", true), errorCode: "invalid_arguments" };
    }
    const validated = validateIssue(args.issue);
    if (validated.errors) {
      return {
        result: toolResult({ error: "issue no cumple el modelo del newsletter.", details: validated.errors }, true),
        errorCode: "invalid_arguments",
      };
    }
    try {
      const draft = await updateNewsletterDraft(args.id, Number(args.expected_revision), validated.issue);
      return { result: toolResult(draft), newsletterId: args.id };
    } catch (cause) {
      if (cause instanceof WrongEmailKindError) {
        return { result: toolResult(wrongKindMessage(cause), true), errorCode: cause.code };
      }
      if (cause instanceof DraftConflictError) {
        return { result: toolResult("The draft is missing, no longer editable, or has a newer revision. Read it again before retrying.", true), errorCode: cause.code };
      }
      throw cause;
    }
  }

  if (name === "set_newsletter_ad_placement") {
    if (!validArguments(args, ["id", "expected_revision", "placement"]) || !uuid(args.id)) {
      return { result: toolResult("id, expected_revision, and placement are required.", true), errorCode: "invalid_arguments" };
    }
    if (!Number.isInteger(args.expected_revision) || Number(args.expected_revision) < 1) {
      return { result: toolResult("expected_revision must be a positive integer.", true), errorCode: "invalid_arguments" };
    }
    if (!isAdPlacement(args.placement)) {
      return { result: toolResult("placement must be top, after_stories, after_essay, or before_footer.", true), errorCode: "invalid_arguments" };
    }
    try {
      const draft = await setNewsletterAdPlacement(args.id, Number(args.expected_revision), args.placement);
      return { result: toolResult(draft), newsletterId: args.id };
    } catch (cause) {
      if (cause instanceof WrongEmailKindError) {
        return { result: toolResult(wrongKindMessage(cause), true), errorCode: cause.code };
      }
      if (cause instanceof DraftConflictError) {
        return { result: toolResult("The draft is missing, no longer editable, or has a newer revision. Read it again before retrying.", true), errorCode: cause.code };
      }
      throw cause;
    }
  }

  if (name === "preview_newsletter_issue") {
    if (!validArguments(args, ["issue"]) || args.issue === undefined) {
      return { result: toolResult("issue es requerido.", true), errorCode: "invalid_arguments" };
    }
    const validated = validateIssue(args.issue);
    if (validated.errors) {
      return {
        result: toolResult({ valid: false, errors: validated.errors }, true),
        errorCode: "invalid_issue",
      };
    }
    return {
      result: toolResult({
        valid: true,
        warnings: issueWarnings(validated.issue),
        html: previewHtml(validated.issue),
      }),
    };
  }

  if (name === "create_standalone_email" || name === "preview_standalone_email") {
    if (!validArguments(args, ["email"]) || !isRecord(args.email)) {
      return { result: toolResult("email es requerido.", true), errorCode: "invalid_arguments" };
    }
    const validated = standaloneInput(args.email);
    if (validated.errors) {
      return {
        result: toolResult({ valid: false, errors: validated.errors }, true),
        errorCode: name === "preview_standalone_email" ? "invalid_email" : "invalid_arguments",
      };
    }
    if (name === "preview_standalone_email") {
      return {
        result: toolResult({
          valid: true,
          warnings: standaloneWarnings(validated.email),
          html: emailPreviewHtml({ kind: "standalone", data: validated.email }),
        }),
      };
    }
    const draft = await insertStandaloneDraft(withoutSlug(validated.email));
    return { result: toolResult(draft), newsletterId: draft.id };
  }

  if (name === "update_standalone_email") {
    if (!validArguments(args, ["id", "expected_revision", "email"]) || !uuid(args.id) || !isRecord(args.email)) {
      return { result: toolResult("id, expected_revision, and email are required.", true), errorCode: "invalid_arguments" };
    }
    if (!Number.isInteger(args.expected_revision) || Number(args.expected_revision) < 1) {
      return { result: toolResult("expected_revision must be a positive integer.", true), errorCode: "invalid_arguments" };
    }
    const validated = standaloneInput(args.email);
    if (validated.errors) {
      return { result: toolResult({ valid: false, errors: validated.errors }, true), errorCode: "invalid_arguments" };
    }
    try {
      const draft = await updateStandaloneDraft(args.id, Number(args.expected_revision), validated.email);
      return { result: toolResult(draft), newsletterId: args.id };
    } catch (cause) {
      if (cause instanceof WrongEmailKindError) {
        return { result: toolResult(wrongKindMessage(cause), true), errorCode: cause.code };
      }
      if (cause instanceof StandaloneConflictError) {
        return {
          result: toolResult("The draft is missing, not a standalone email, no longer editable, or has a newer revision. Read it again before retrying.", true),
          errorCode: cause.code,
        };
      }
      throw cause;
    }
  }

  if (name === "send_standalone_email") {
    if (!validArguments(args, ["id", "to"]) || !uuid(args.id) || typeof args.to !== "string") {
      return { result: toolResult("id (UUID) and to (email) are required.", true), errorCode: "invalid_arguments" };
    }
    try {
      const sent = await sendStandaloneTo(args.id, args.to, actor.tokenId);
      return { result: toolResult(sent), newsletterId: args.id };
    } catch (cause) {
      if (cause instanceof DirectSendError) {
        const body = cause.details ? { error: cause.message, details: cause.details } : cause.message;
        return { result: toolResult(body, true), errorCode: cause.code, newsletterId: args.id };
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
      instructions:
        "Use these tools only for AI Builders newsletter drafts. Publishing, sending to the list, and deletion are intentionally unavailable. " +
        "send_standalone_email (only on credentials that have it) sends one real email to one address: use it only when the user asked for that exact send. " +
        "Use set_newsletter_ad_placement to move the sponsor slot without replacing the issue.",
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
  if (
    !isRecord(message.params)
    || !onlyKeys(message.params, ["name", "arguments", "_meta"])
    || typeof message.params.name !== "string"
    || (message.params._meta !== undefined && !isRecord(message.params._meta))
  ) {
    return error(responseId, -32602, "Invalid tool call parameters.");
  }

  const operation = message.params.name.slice(0, 100);
  const started = performance.now();
  if (!(await withinMcpOperationRateLimit(actor, operation))) {
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
