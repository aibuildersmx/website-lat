import { describe, expect, it } from "vitest";
import { emptyIssue } from "@/lib/newsletter/issue";
import { validateIssue } from "@/lib/newsletter/validation";
import { BASE_ISSUE_REQUIRED, newsletterIssueJsonSchema } from "@/lib/newsletter/issue-schema";

type SchemaObject = {
  type: string;
  properties: Record<string, unknown>;
  required: readonly string[];
  additionalProperties: boolean;
};

const schema = newsletterIssueJsonSchema as unknown as SchemaObject;

describe("Issue JSON Schema ↔ runtime validation contract", () => {
  it("declares every property with no additional properties allowed", () => {
    expect(schema.additionalProperties).toBe(false);
    const declared = Object.keys(schema.properties).sort();
    // The schema's key set is authoritative for clients; the validator must
    // agree: a valid issue may only use declared keys, and any undeclared key
    // must be rejected by both sides.
    expect(declared).toContain("spanish");
    expect(declared).toContain("spanishTranslationStale");
    expect(declared.length).toBe(24); // 22 BaseIssue keys + spanish + stale flag
  });

  it("every schema-required field is required by the validator", () => {
    for (const field of BASE_ISSUE_REQUIRED) {
      const issue = { ...emptyIssue("009") } as Record<string, unknown>;
      delete issue[field];
      const result = validateIssue(issue);
      expect(result.errors, `deleting "${field}" should fail validation`).toBeDefined();
    }
  });

  it("every schema-optional field really is optional in the validator", () => {
    const optional = Object.keys(schema.properties).filter(
      (key) => !schema.required.includes(key) && key !== "spanish" && key !== "spanishTranslationStale",
    );
    // emptyIssue omits every optional field except showIssueLabel; strip it too.
    const issue = { ...emptyIssue("009") } as Record<string, unknown>;
    delete issue.showIssueLabel;
    for (const key of optional) {
      expect(key in issue, `emptyIssue should not carry optional "${key}"`).toBe(false);
    }
    expect(validateIssue(issue).errors).toBeUndefined();
  });

  it("a key not present in the schema is rejected by the validator", () => {
    const result = validateIssue({ ...emptyIssue("009"), sneaky: true });
    expect(result.errors).toContain("issue: claves desconocidas: sneaky");
    expect("sneaky" in schema.properties).toBe(false);
  });

  it("the canonical empty issue passes validation", () => {
    expect(validateIssue(emptyIssue("009")).errors).toBeUndefined();
  });
});
