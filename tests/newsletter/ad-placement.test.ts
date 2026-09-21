import { describe, expect, it } from "vitest";
import { syncAdPlacement } from "@/lib/newsletter/ad-placement";
import { emptyIssue } from "@/lib/newsletter/issue";

describe("syncAdPlacement", () => {
  it("copies the original placement onto the Spanish issue", () => {
    const issue = emptyIssue("008");
    issue.adPlacement = "after_essay";
    issue.spanish = emptyIssue("008");

    const synced = syncAdPlacement(issue);
    expect(synced.spanish?.adPlacement).toBe("after_essay");
    expect(synced.spanish?.slug).toBe("008");
  });

  it("leaves an issue without a Spanish copy unchanged", () => {
    const issue = { ...emptyIssue("008"), adPlacement: "top" as const };
    expect(syncAdPlacement(issue)).toBe(issue);
  });
});
