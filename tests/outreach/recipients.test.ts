import { describe, expect, it } from "vitest";
import {
  addOutreachRecipients,
  toggleOutreachRecipient,
} from "@/lib/outreach/recipients";

describe("outreach recipient selection", () => {
  it("adds and removes a customer without duplicating addresses", () => {
    expect(toggleOutreachRecipient("first@example.com", "Second@Example.com")).toBe(
      "first@example.com\nsecond@example.com",
    );
    expect(
      toggleOutreachRecipient(
        "first@example.com\nsecond@example.com",
        "SECOND@example.com",
      ),
    ).toBe("first@example.com");
  });

  it("adds visible customers uniquely and respects the send limit", () => {
    expect(
      addOutreachRecipients(
        "first@example.com",
        ["FIRST@example.com", "second@example.com", "third@example.com"],
        2,
      ),
    ).toBe("first@example.com\nsecond@example.com");
  });
});
