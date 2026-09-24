// The one door to email HTML. Every caller that needs "what this row sends"
// (send-batch, test sends, previews, MCP) goes through here, so a new kind
// only has to be taught in one place.
import { stripTracking } from "./open-pixel";
import { renderBuildLog } from "./render";
import { renderStandalone } from "./render-standalone";
import type { StandaloneEmail } from "./standalone-types";
import type { Issue } from "./types";

export type EmailDraft =
  | { kind: "build_log"; data: Issue }
  | { kind: "standalone"; data: StandaloneEmail };

export function renderEmail(draft: EmailDraft): string {
  return draft.kind === "standalone" ? renderStandalone(draft.data) : renderBuildLog(draft.data);
}

export function emailSubject(draft: EmailDraft): string {
  return draft.kind === "standalone" ? draft.data.subject : draft.data.spanish?.subject ?? draft.data.subject;
}

export function emailPreviewHtml(draft: EmailDraft): string {
  return stripTracking(renderEmail(draft).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#"));
}
