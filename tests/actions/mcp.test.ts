import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  values: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/db/client", () => ({
  db: { insert: () => ({ values: mocks.values }) },
}));

import { createMcpToken } from "@/lib/actions/mcp";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("createMcpToken scope presets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: "10000000-0000-4000-8000-000000000001", role: "admin" });
    mocks.values.mockResolvedValue(undefined);
  });

  it("defaults to the full editor preset", async () => {
    const result = await createMcpToken({}, form({ name: "MacBook de Ben" }));
    expect(result.token).toMatch(/^aibl_mcp_v1_/);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      scopes: ["newsletter:drafts:read", "newsletter:drafts:write", "newsletter:preview"],
    }));
  });

  it("creates a preview-only token", async () => {
    const result = await createMcpToken({}, form({ name: "Token de Esteban", scopes: "preview" }));
    expect(result.error).toBeUndefined();
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      scopes: ["newsletter:preview"],
    }));
  });

  it("rejects unknown presets", async () => {
    const result = await createMcpToken({}, form({ name: "X", scopes: "admin" }));
    expect(result.error).toBe("Preset de permisos inválido.");
    expect(mocks.values).not.toHaveBeenCalled();
  });
});
