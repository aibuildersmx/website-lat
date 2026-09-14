import { describe, expect, it } from "vitest";
import { bearerToken, generateMcpToken, hashMcpToken } from "@/lib/mcp/tokens";

describe("MCP credentials", () => {
  it("generates a versioned high-entropy token and a one-way persisted value", () => {
    const token = generateMcpToken();
    expect(token.raw).toMatch(/^aibl_mcp_v1_[A-Za-z0-9_-]{43}$/);
    expect(token.hash).toBe(hashMcpToken(token.raw));
    expect(token.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(token.hash).not.toContain(token.raw);
    expect(token.displayPrefix).not.toBe(token.raw);
  });

  it("accepts a case-insensitive Bearer scheme with required whitespace", () => {
    expect(bearerToken("Bearer aibl_mcp_v1_secret")).toBe("aibl_mcp_v1_secret");
    expect(bearerToken("bearer aibl_mcp_v1_secret")).toBe("aibl_mcp_v1_secret");
    expect(bearerToken("BEARER\taibl_mcp_v1_secret")).toBe("aibl_mcp_v1_secret");
  });

  it("rejects missing, unsupported, and ambiguous credentials", () => {
    expect(bearerToken("Beareraibl_mcp_v1_secret")).toBeNull();
    expect(bearerToken("Basic aibl_mcp_v1_secret")).toBeNull();
    expect(bearerToken("Bearer one, Bearer two")).toBeNull();
    expect(bearerToken("Bearer token with spaces")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});
