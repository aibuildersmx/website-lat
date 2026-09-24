import { emailPreviewHtml } from "./render-email";
import type { StandaloneEmail } from "./standalone-types";
import type { Issue } from "./types";

// Exactly what the send would produce, minus tracking, with Resend's
// unsubscribe placeholder resolved to a no-op link. Shared by the composer's
// iframe preview (lib/actions/newsletter.ts) and the MCP preview tool.
export function previewHtml(issue: Issue): string {
  return emailPreviewHtml({ kind: "build_log", data: issue });
}

// Non-blocking heads-ups for authors: valid but probably not ready to ship.
// Evaluates the variant the send would use (spanish ?? base), same as the renderer.
export function issueWarnings(issue: Issue): string[] {
  const warnings: string[] = [];
  const sent = issue.spanish ?? issue;
  if (!issue.spanish) {
    warnings.push("Sin versión en español: se genera en el composer antes de enviar.");
  }
  if (!sent.preview.trim()) warnings.push("preview (texto de inbox) está vacío.");
  if (sent.subject.length > 150) {
    warnings.push(`subject tiene ${sent.subject.length} caracteres; el inbox trunca arriba de ~150.`);
  }
  if (sent.stories.length === 0) warnings.push("stories está vacío.");
  if (sent.useCases.length === 0) warnings.push("useCases está vacío.");
  if (sent.events.length === 0) warnings.push("events está vacío.");
  if (sent.jobs.length === 0) warnings.push("jobs está vacío.");
  sent.stories.forEach((story, index) => {
    if (!story.href) warnings.push(`stories[${index}].href está vacío (el título no tendrá link).`);
  });
  if (!sent.essay.linkHref) warnings.push("essay.linkHref está vacío.");
  (sent.projects ?? []).forEach((project, index) => {
    if (!project.href) warnings.push(`projects[${index}].href está vacío.`);
  });
  sent.events.forEach((event, index) => {
    if (!event.href) warnings.push(`events[${index}].href está vacío.`);
  });
  sent.jobs.forEach((job, index) => {
    if (!job.href) warnings.push(`jobs[${index}].href está vacío.`);
  });
  return warnings;
}

export function standaloneWarnings(email: StandaloneEmail): string[] {
  const warnings: string[] = [];
  if (!email.subject.trim()) warnings.push("subject está vacío.");
  if (email.subject.length > 150) {
    warnings.push(`subject tiene ${email.subject.length} caracteres; el inbox trunca arriba de ~150.`);
  }
  if (!email.preview.trim()) warnings.push("preview (texto de inbox) está vacío.");
  if (!email.title.trim()) warnings.push("title está vacío.");
  if (!email.body.trim()) warnings.push("body está vacío.");
  return warnings;
}
