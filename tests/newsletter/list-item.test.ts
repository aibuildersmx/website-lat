import { describe, expect, it } from "vitest";
import { listIssueItem } from "@/lib/newsletter/list-item";
import { emptyIssue } from "@/lib/newsletter/issue";
import { emptyStandalone } from "@/lib/newsletter/standalone-types";

const base = { id: "x", slug: "s-abc12345", subject: "S", status: "draft", sentAt: null, updatedAt: new Date() };

describe("listIssueItem", () => {
  it("maps standalone rows without a date or archive flag", () => {
    expect(listIssueItem({ ...base, kind: "standalone", data: emptyStandalone("s-abc12345") as never }))
      .toMatchObject({ kind: "standalone", date: "", archivePublished: false });
  });

  it("maps Build Log rows as before", () => {
    const issue = { ...emptyIssue("010"), date: "01 Sep 2026" };
    expect(listIssueItem({ ...base, slug: "010", kind: "build_log", data: issue }))
      .toMatchObject({ kind: "build_log", date: "01 Sep 2026", archivePublished: true });
  });
});
