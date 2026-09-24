// Shared primitives for every newsletter email (The Build Log and standalone
// emails): escaping, palette, fonts, hairlines, and the legal footer/pixel.

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Palette — light-first, mirroring the admin preview canvas (Tailwind gray
// scale on white). The email ships light; dark-mode clients (Apple Mail, etc.)
// auto-invert cleanly thanks to the color-scheme meta in <head>. See the
// editable-canvas component for the source-of-truth color choices.
export const BG = "#ffffff"; // body / page (canvas: bg-white)
export const PANEL = "#fafaf9"; // card surfaces (canvas: stone-50)
export const TEXT = "#111827"; // headings (gray-900)
export const MUTED = "#6b7280"; // body copy (gray-500)
export const QUIET = "#9ca3af"; // eyebrows, counters, mono labels (gray-400)
export const LINE = "#e5e7eb"; // hairlines + card borders (gray-200)
export const ACCENT = "#111827"; // links that need emphasis (text color, underlined)

export const SANS =
  "Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO = "'SF Mono', Menlo, Consolas, monospace";

export function hr(topPadding = 0): string {
  return `<tr><td style="padding:${topPadding}px 0 0;"><div style="height:1px;line-height:1px;font-size:1px;background:${LINE};">&nbsp;</div></td></tr>`;
}

// Unsubscribe + community links. Required in every list email (CAN-SPAM /
// Gmail bulk-sender rules); the placeholder is resolved per contact at send time.
export function legalFooterLinks(): string {
  return `<p style="margin:0;color:${QUIET};font-family:${MONO};font-size:12px;letter-spacing:normal;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${ACCENT};text-decoration:underline;">Cancelar suscripción</a>
      &nbsp;·&nbsp; <a href="https://aibuilders.lat" style="color:#2563eb;text-decoration:underline;">AI BUILDERS LATAM</a>
      &nbsp;·&nbsp; <a href="https://aibuilders.mx" style="color:#2563eb;text-decoration:underline;">AI BUILDERS MEXICO</a>
    </p>`;
}

export const OPEN_PIXEL_TAG = `<!-- First-party open pixel. Swapped for a signed per-contact URL at send time
     (lib/newsletter/tracking.ts); stripped in previews/tests. -->
<img src="{{{OPEN_PIXEL}}}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;overflow:hidden;">`;
