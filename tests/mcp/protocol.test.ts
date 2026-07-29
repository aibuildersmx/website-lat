import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  placeAd: vi.fn(),
  rate: vi.fn(),
  audit: vi.fn(),
  preview: vi.fn(),
  warnings: vi.fn(),
}));

vi.mock("@/lib/mcp/newsletters", () => ({
  DraftConflictError: class DraftConflictError extends Error { code = "draft_conflict"; },
  listNewsletterDrafts: mocks.list,
  getNewsletterDraft: mocks.get,
  createNewsletterDraft: mocks.create,
  updateNewsletterDraft: mocks.update,
  setNewsletterAdPlacement: mocks.placeAd,
}));
vi.mock("@/lib/mcp/audit", () => ({
  withinMcpOperationRateLimit: mocks.rate,
  recordMcpAudit: mocks.audit,
}));
vi.mock("@/lib/mcp/auth", () => ({
  MCP_READ_SCOPE: "newsletter:drafts:read",
  MCP_WRITE_SCOPE: "newsletter:drafts:write",
  MCP_PREVIEW_SCOPE: "newsletter:preview",
  hasScope: (actor: { scopes: string[] }, scope: string) => actor.scopes.includes(scope),
}));
vi.mock("@/lib/newsletter/preview", () => ({
  previewHtml: mocks.preview,
  issueWarnings: mocks.warnings,
}));

import { MCP_READ_SCOPE, MCP_WRITE_SCOPE } from "@/lib/mcp/auth";
import { DraftConflictError } from "@/lib/mcp/newsletters";
import { handleMcpRequest, NEWSLETTER_MCP_TOOLS } from "@/lib/mcp/protocol";
import { emptyIssue } from "@/lib/newsletter/issue";

const actor = {
  userId: "10000000-0000-4000-8000-000000000001",
  tokenId: "10000000-0000-4000-8000-000000000002",
  scopes: [MCP_READ_SCOPE, MCP_WRITE_SCOPE, "newsletter:preview"],
};

describe("newsletter MCP protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rate.mockResolvedValue(true);
    mocks.audit.mockResolvedValue(undefined);
    mocks.preview.mockReturnValue("<!doctype html><html>preview</html>");
    mocks.warnings.mockReturnValue(["stories está vacío."]);
  });

  it("exposes only draft-safe tools", () => {
    expect(NEWSLETTER_MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "list_newsletter_drafts",
      "get_newsletter_draft",
      "create_newsletter_draft",
      "update_newsletter_draft",
      "set_newsletter_ad_placement",
      "preview_newsletter_issue",
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

  it("accepts MCP-reserved metadata on tool calls", async () => {
    mocks.list.mockResolvedValueOnce([]);

    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "list_newsletter_drafts",
        arguments: { limit: 10 },
        _meta: { progressToken: "codex-call" },
      },
    }, actor);

    expect(response).toMatchObject({
      result: {
        structuredContent: { drafts: [] },
      },
    });
    expect(mocks.list).toHaveBeenCalledWith(10);
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

  it("moves a draft ad slot without replacing the issue", async () => {
    mocks.placeAd.mockResolvedValueOnce({ id: "10000000-0000-4000-8000-000000000099", version: 2 });
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "set_newsletter_ad_placement",
        arguments: {
          id: "10000000-0000-4000-8000-000000000099",
          expected_revision: 1,
          placement: "after_essay",
        },
      },
    }, actor);
    expect(response && "result" in response ? response.result.isError : true).toBeUndefined();
    expect(mocks.placeAd).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000099",
      1,
      "after_essay",
    );
  });

  it("rejects an unknown ad placement before persistence", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "set_newsletter_ad_placement",
        arguments: {
          id: "10000000-0000-4000-8000-000000000099",
          expected_revision: 1,
          placement: "middle",
        },
      },
    }, actor);
    expect(response && "result" in response ? response.result.isError : false).toBe(true);
    expect(mocks.placeAd).not.toHaveBeenCalled();
  });

  it("hides ad placement from read-only credentials", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "set_newsletter_ad_placement",
        arguments: {
          id: "10000000-0000-4000-8000-000000000099",
          expected_revision: 1,
          placement: "top",
        },
      },
    }, { ...actor, scopes: [MCP_READ_SCOPE] });
    expect(response && "result" in response ? response.result.isError : false).toBe(true);
    expect(mocks.placeAd).not.toHaveBeenCalled();
  });

  it("previews a valid issue without touching persistence", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: "preview_newsletter_issue", arguments: { issue: emptyIssue("011") } },
    }, actor);
    expect(response).toMatchObject({
      result: {
        structuredContent: {
          valid: true,
          warnings: ["stories está vacío."],
          html: "<!doctype html><html>preview</html>",
        },
      },
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns field-level errors and no html for an invalid issue", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: { name: "preview_newsletter_issue", arguments: { issue: { nope: true } } },
    }, actor);
    const result = response && "result" in response ? response.result : null;
    expect(result?.isError).toBe(true);
    const text = (result?.content as Array<{ text: string }>)[0]?.text ?? "";
    expect(text).toContain('"valid": false');
    expect(text).toContain("claves desconocidas: nope");
    expect(text).not.toContain("<!doctype");
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("hides the preview tool from tokens without the preview scope", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: "t", method: "tools/list" },
      { ...actor, scopes: [MCP_READ_SCOPE, MCP_WRITE_SCOPE] },
    );
    const tools = response && "result" in response ? (response.result.tools as Array<{ name: string }>) : [];
    expect(tools.map((tool) => tool.name)).not.toContain("preview_newsletter_issue");
  });

  it("a preview-only token sees exactly one tool", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: "p", method: "tools/list" },
      { ...actor, scopes: ["newsletter:preview"] },
    );
    const tools = response && "result" in response ? (response.result.tools as Array<{ name: string }>) : [];
    expect(tools.map((tool) => tool.name)).toEqual(["preview_newsletter_issue"]);
  });

  it("surfaces field-level details when create receives a bad issue", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 12,
      method: "tools/call",
      params: { name: "create_newsletter_draft", arguments: { issue: { nope: true } } },
    }, actor);
    const result = response && "result" in response ? response.result : null;
    expect(result?.isError).toBe(true);
    expect((result?.content as Array<{ text: string }>)[0]?.text).toContain("claves desconocidas: nope");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
