import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () =>
            Promise.resolve([
              {
                slug: "002",
                data: {
                  issueLabel: "Issue 002",
                  date: "15 Jun 2026",
                  readingTime: "6 min de lectura",
                  title: "The Build Log",
                  subtitle: "Weekly summary",
                  spanish: {
                    issueLabel: "Issue 002",
                    date: "15 Jun 2026",
                    readingTime: "6 min de lectura",
                    title: "The Build Log",
                    subtitle: "Resumen semanal en español",
                  },
                },
              },
            ]),
        }),
      }),
    }),
  },
}));

import { listPublishedIssues } from "@/lib/newsletter/archive";

describe("listPublishedIssues", () => {
  it("maps sent issues to archive cards", async () => {
    const cards = await listPublishedIssues();
    expect(cards).toEqual([
      {
        slug: "002",
        issueLabel: "Issue 002",
        date: "15 Jun 2026",
        readingTime: "6 min de lectura",
        title: "The Build Log",
        subtitle: "Resumen semanal en español",
      },
    ]);
  });
});
