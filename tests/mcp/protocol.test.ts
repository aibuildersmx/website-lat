import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  rate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/mcp/newsletters", () => ({
  DraftConflictError: class DraftConflictError extends Error { code = "draft_conflict"; },
  listNewsletterDrafts: mocks.list,
  getNewsletterDraft: mocks.get,
  createNewsletterDraft: mocks.create,
  updateNewsletterDraft: mocks.update,
}));
vi.mock("@/lib/mcp/audit", () => ({
  withinMcpMutationRateLimit: mocks.rate,
  recordMcpAudit: mocks.audit,
}));
vi.mock("@/lib/mcp/auth", () => ({
  MCP_READ_SCOPE: "newsletter:drafts:read",
  MCP_WRITE_SCOPE: "newsletter:drafts:write",
  hasScope: (actor: { scopes: string[] }, scope: string) => actor.scopes.includes(scope),
}));

import { MCP_READ_SCOPE, MCP_WRITE_SCOPE } from "@/lib/mcp/auth";
import { DraftConflictError } from "@/lib/mcp/newsletters";
import { handleMcpRequest, NEWSLETTER_MCP_TOOLS } from "@/lib/mcp/protocol";
import { emptyIssue } from "@/lib/newsletter/issue";

const actor = {
  userId: "10000000-0000-4000-8000-000000000001",
  tokenId: "10000000-0000-4000-8000-000000000002",
  scopes: [MCP_READ_SCOPE, MCP_WRITE_SCOPE],
};

describe("newsletter MCP protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rate.mockResolvedValue(true);
    mocks.audit.mockResolvedValue(undefined);
  });

  it("exposes only draft-safe tools", () => {
    expect(NEWSLETTER_MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "list_newsletter_drafts",
      "get_newsletter_draft",
      "create_newsletter_draft",
      "update_newsletter_draft",
    ]);
    expect(NEWSLETTER_MCP_TOOLS.map((tool) => tool.name).join(" ")).not.toMatch(/publish|delete|send|translate/);
  });

  it("negotiates tools and describes the draft-only boundary", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
    }, actor);
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: false } } },
    });
  });

  it("filters write tools when a token has read-only scope", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: "tools", method: "tools/list" },
      { ...actor, scopes: [MCP_READ_SCOPE] },
    );
    expect(response && "result" in response ? response.result.tools : null).toHaveLength(2);
  });

  it("rejects unknown methods and unknown tools", async () => {
    await expect(handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "newsletter/publish" }, actor))
      .resolves.toMatchObject({ error: { code: -32601 } });
    await expect(handleMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "delete_newsletter", arguments: {} },
    }, actor)).resolves.toMatchObject({ error: { code: -32602 } });
  });

  it("rejects extra tool arguments before persistence", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_newsletter_drafts", arguments: { status: "sent" } },
    }, actor);
    expect(response && "result" in response ? response.result.isError : false).toBe(true);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("treats initialized as a notification with no response", async () => {
    await expect(handleMcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" }, actor))
      .resolves.toBeNull();
  });

  it("never responds to or executes unknown notifications", async () => {
    await expect(handleMcpRequest({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "create_newsletter_draft", arguments: {} },
    }, actor)).resolves.toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("reports a missing draft conflict without attaching an invalid audit foreign key", async () => {
    mocks.update.mockRejectedValueOnce(new DraftConflictError("missing"));
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "update_newsletter_draft",
        arguments: {
          id: "10000000-0000-4000-8000-000000000099",
          expected_revision: 1,
          issue: emptyIssue("099"),
        },
      },
    }, actor);
    expect(response && "result" in response ? response.result.isError : false).toBe(true);
    expect(mocks.audit).toHaveBeenCalledWith(expect.not.objectContaining({ newsletterId: expect.anything() }));
  });
});
