import { ACCENT, BG, MUTED, SANS, TEXT, esc, hr, legalFooterLinks, OPEN_PIXEL_TAG } from "./email-style";
import { renderMarkdown } from "./render-markdown";
import type { StandaloneEmail } from "./standalone-types";

const MARKDOWN_STYLE = {
  p: `margin:0 0 20px;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.6;`,
  h2: `margin:32px 0 16px;color:${TEXT};font-family:${SANS};font-size:26px;font-weight:600;line-height:1.2;`,
  li: `margin:0 0 8px;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.55;`,
  a: `color:${ACCENT};text-decoration:underline;`,
};

// A one-off list email: same brand shell and legal footer as The Build Log,
// but a single free-form body instead of curated sections.
export function renderStandalone(email: StandaloneEmail): string {
  const subtitle = email.subtitle?.trim()
    ? `<p style="margin:10px 0 0;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.4;">${esc(email.subtitle)}</p>`
    : "";
  const cta = email.cta?.text.trim() && email.cta.href
    ? `<tr><td style="padding:8px 0 0;">
    <a href="${esc(email.cta.href)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:${TEXT};color:#ffffff;font-family:${SANS};font-size:16px;font-weight:600;text-decoration:none;">${esc(email.cta.text)}</a>
  </td></tr>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(email.title || email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(email.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:32px 16px 64px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

  <tr><td style="padding:0 0 24px;">
    <h1 style="margin:0;color:${TEXT};font-family:${SANS};font-size:38px;font-weight:600;line-height:1.1;">${esc(email.title)}</h1>
    ${subtitle}
  </td></tr>
  ${hr()}

  <tr><td style="padding:28px 0 0;">
    ${renderMarkdown(email.body, MARKDOWN_STYLE)}
  </td></tr>
  ${cta}

  ${hr(40)}
  <tr><td style="padding:32px 0 0;">
    ${legalFooterLinks()}
  </td></tr>

</table>
</td></tr>
</table>
${OPEN_PIXEL_TAG}
</body>
</html>`;
}
