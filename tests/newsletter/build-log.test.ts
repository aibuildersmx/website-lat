import { describe, it, expect } from "vitest";
import { renderBuildLog } from "@/lib/newsletter/render";
import issue002 from "./fixtures/sample-issue";

describe("renderBuildLog", () => {
  const html = renderBuildLog(issue002);

  it("includes the issue title and subtitle", () => {
    expect(html).toContain("The Build Log");
    expect(html).toContain(issue002.subtitle);
  });

  it("renders every story title and link", () => {
    for (const s of issue002.stories) {
      expect(html).toContain(s.title);
      expect(html).toContain(s.href);
    }
  });

  it("renders the essay, events, and job", () => {
    expect(html).toContain(issue002.essay.title);
    expect(html).toContain(issue002.events[0].title);
    expect(html).toContain(issue002.jobs[0].title);
  });

  it("includes the Resend unsubscribe token", () => {
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("is email-safe: no clamp(), no CSS vars, no <style> block", () => {
    expect(html).not.toContain("clamp(");
    expect(html).not.toContain("var(--");
    expect(html).not.toMatch(/<style[\s>]/);
  });

  it("escapes HTML special characters in content", () => {
    const evil = { ...issue002, title: "A & B <script>" };
    const out = renderBuildLog(evil);
    expect(out).toContain("A &amp; B &lt;script&gt;");
    expect(out).not.toContain("<script>");
  });
});
