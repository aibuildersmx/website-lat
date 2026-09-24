import { describe, expect, it } from "vitest";
import { listIssueItem, sortIssueList } from "@/lib/newsletter/list-item";
import { emptyIssue } from "@/lib/newsletter/issue";
import { emptyStandalone } from "@/lib/newsletter/standalone-types";

const base = { id: "x", slug: "s-abc12345", subject: "S", status: "draft", sentAt: null, updatedAt: new Date() };

describe("listIssueItem", () => {
  it("dates standalone rows by send (or last edit) and keeps them out of the archive", () => {
    const updatedAt = new Date("2026-09-24T18:00:00Z");
    expect(listIssueItem({ ...base, updatedAt, kind: "standalone", data: emptyStandalone("s-abc12345") as never }))
      .toMatchObject({ kind: "standalone", date: "24 Sep 2026", archivePublished: false });
    const sentAt = new Date("2026-09-20T18:00:00Z");
    expect(listIssueItem({ ...base, updatedAt, sentAt, kind: "standalone", data: emptyStandalone("s-abc12345") as never }).date)
      .toBe("20 Sep 2026");
  });

  it("maps Build Log rows as before", () => {
    const issue = { ...emptyIssue("010"), date: "01 Sep 2026" };
    expect(listIssueItem({ ...base, slug: "010", kind: "build_log", data: issue }))
      .toMatchObject({ kind: "build_log", date: "01 Sep 2026", archivePublished: true });
  });
});

describe("sortIssueList", () => {
  it("places a fresh standalone email among Build Logs by date, not at the bottom", () => {
    const old = listIssueItem({ ...base, id: "old", slug: "010", kind: "build_log", data: { ...emptyIssue("010"), date: "01 Jun 2026" } });
    const recent = listIssueItem({ ...base, id: "recent", slug: "015", kind: "build_log", data: { ...emptyIssue("015"), date: "15 Sep 2026" } });
    const standalone = listIssueItem({
      ...base,
      id: "standalone",
      kind: "standalone",
      updatedAt: new Date("2026-09-24T18:00:00Z"),
      data: emptyStandalone("s-abc12345") as never,
    });
    expect(sortIssueList([old, standalone, recent]).map((item) => item.id)).toEqual(["standalone", "recent", "old"]);
  });
});
