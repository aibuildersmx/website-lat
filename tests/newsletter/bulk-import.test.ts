import { describe, expect, it } from "vitest";
import { parseBulkSubscriberEmails } from "@/lib/newsletter/bulk-import";

describe("parseBulkSubscriberEmails", () => {
  it("accepts comma and whitespace separated emails", () => {
    const parsed = parseBulkSubscriberEmails(
      "Ana@Example.com, ben@example.com\ncarla@example.com dan@example.com",
    );

    expect(parsed.emails).toEqual([
      "ana@example.com",
      "ben@example.com",
      "carla@example.com",
      "dan@example.com",
    ]);
    expect(parsed.duplicateInputCount).toBe(0);
    expect(parsed.invalidCount).toBe(0);
  });

  it("dedupes normalized input without dropping the first occurrence", () => {
    const parsed = parseBulkSubscriberEmails(
      "A@Example.com a@example.com mailto:A@example.com b@example.com",
    );

    expect(parsed.emails).toEqual(["a@example.com", "b@example.com"]);
    expect(parsed.duplicateInputCount).toBe(2);
  });

  it("handles simple csv exports with quoted email cells", () => {
    const parsed = parseBulkSubscriberEmails(
      "email,source\n\"first@example.com\",manual\n<second@example.com>,manual",
    );

    expect(parsed.emails).toEqual(["first@example.com", "second@example.com"]);
  });

  it("counts invalid email-like tokens without treating headers as invalid", () => {
    const parsed = parseBulkSubscriberEmails(
      "email\nvalid@example.com broken@example nope@domain another-valid@example.com",
    );

    expect(parsed.emails).toEqual(["valid@example.com", "another-valid@example.com"]);
    expect(parsed.invalidCount).toBe(2);
    expect(parsed.invalidSamples).toEqual(["broken@example", "nope@domain"]);
  });
});
