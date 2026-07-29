// Pure open-pixel placeholder handling, split out of tracking.ts so the preview
// path (lib/newsletter/preview.ts) can strip tracking without importing the DB
// client that tracking.ts needs for logEvent.

// Literal the renderer emits where the open pixel goes (see render.ts), swapped for
// a real per-contact pixel URL at send time.
export const OPEN_PIXEL_PLACEHOLDER = "{{{OPEN_PIXEL}}}";

/** Remove tracking for previews / contact-less test sends (no live pixel placeholder). */
export function stripTracking(html: string): string {
  return html.split(OPEN_PIXEL_PLACEHOLDER).join("");
}
