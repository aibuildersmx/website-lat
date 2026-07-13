import type { BaseIssue, Issue } from "./types";

function esc(s: string): string {
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
const BG = "#ffffff"; // body / page (canvas: bg-white)
const PANEL = "#fafaf9"; // card surfaces (canvas: stone-50)
const TEXT = "#111827"; // headings (gray-900)
const MUTED = "#6b7280"; // body copy (gray-500)
const QUIET = "#9ca3af"; // eyebrows, counters, mono labels (gray-400)
const LINE = "#e5e7eb"; // hairlines + card borders (gray-200)
const ACCENT = "#111827"; // links that need emphasis (text color, underlined)

const SANS =
  "Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MONO = "'SF Mono', Menlo, Consolas, monospace";

function hr(): string {
  return `<tr><td style="padding:0;"><div style="height:1px;line-height:1px;font-size:1px;background:${LINE};">&nbsp;</div></td></tr>`;
}

function eyebrow(text: string): string {
  return `<p style="margin:0 0 18px;color:${QUIET};font-family:${MONO};font-size:13px;font-weight:500;letter-spacing:normal;text-transform:uppercase;">${esc(
    text,
  )}</p>`;
}

function eventLocation(label: string): string {
  const location = label.replace(/^(AI BUILDERS|AIBM)\s*[-·]\s*/i, "").trim();
  return /^ONLINE$/i.test(location) ? "VIRTUAL" : location || "VIRTUAL";
}

function sectionHeader(title: string, compact = false): string {
  return `<tr><td style="padding:32px 0 24px;">
    <h2 style="margin:0;color:${TEXT};font-family:${SANS};font-size:${compact ? "28px" : "34px"};font-weight:600;line-height:1.1;">${esc(title)}</h2>
  </td></tr>`;
}

function renderIssue(issue: BaseIssue): string {
  const documentTitle =
    issue.showIssueLabel !== false && issue.issueLabel.trim()
      ? `${issue.title} · ${issue.issueLabel}`
      : issue.title;
  const metadata = [
    issue.showIssueLabel !== false && issue.issueLabel.trim() ? issue.issueLabel : null,
    issue.date,
    issue.readingTime,
  ]
    .filter((value): value is string => Boolean(value))
    .map(esc)
    .join(" &nbsp;·&nbsp; ");

  const stories = issue.stories
    .map(
      (s) => `
      <div style="padding:4px 0 12px;margin-bottom:8px;">
        <h3 style="margin:0;font-family:${SANS};font-size:20px;font-weight:600;line-height:1.25;">
          <a class="title-link" href="${esc(s.href)}" style="color:${TEXT};text-decoration:none;">${esc(
        s.title,
      )} ↗</a>
        </h3>
        <p style="margin:10px 0 0;color:${MUTED};font-family:${SANS};font-size:17px;line-height:1.55;">${esc(
          s.body,
        )}</p>
      </div>`,
    )
    .join("");

  const projects = (issue.projects ?? [])
    .map(
      (p) => `
      <div style="padding:0 0 40px;border-bottom:1px solid ${LINE};margin-bottom:32px;">
        ${eyebrow(p.eyebrow)}
        <h3 style="margin:0;font-family:${SANS};font-size:24px;font-weight:600;line-height:1.25;">
          ${
            p.href
              ? `<a href="${esc(p.href)}" style="color:${TEXT};text-decoration:none;">${esc(
                  p.title,
                )} ↗</a>`
              : `<span style="color:${TEXT};">${esc(p.title)}</span>`
          }
        </h3>
        <p style="margin:8px 0 0;color:${QUIET};font-family:${MONO};font-size:13px;letter-spacing:normal;text-transform:uppercase;">por ${esc(
          p.author,
        )}</p>
        <p style="margin:14px 0 0;color:${MUTED};font-family:${SANS};font-size:17px;line-height:1.55;">${esc(
          p.body,
        )}</p>
      </div>`,
    )
    .join("");

  const events = issue.events
    .map(
      (e) => `
      <div style="padding:4px 0 12px;margin-bottom:8px;">
        <p style="margin:0 0 6px;color:${QUIET};font-family:${MONO};font-size:13px;letter-spacing:normal;text-transform:uppercase;">${esc(
        `${e.day} ${e.month} · ${eventLocation(e.label)}`,
      )}</p>
        <h3 style="margin:0;font-family:${SANS};font-size:22px;font-weight:600;"><a class="title-link" href="${esc(
          e.href,
        )}" style="color:${TEXT};text-decoration:none;">${esc(e.title)} ↗</a></h3>
        <p style="margin:12px 0 0;color:${MUTED};font-family:${SANS};font-size:16px;line-height:1.5;">${esc(
          e.body,
        )}</p>
      </div>`,
    )
    .join("");

  const essayBlock = `<tr><td>
    <div style="padding:32px;border:1px solid ${LINE};border-radius:18px;background:${PANEL};">
      ${eyebrow(issue.essay.eyebrow)}
      <h3 style="margin:0 0 16px;font-family:${SANS};font-size:30px;font-weight:400;line-height:1.15;color:${TEXT};">${esc(
        issue.essay.title,
      )}</h3>
      <p style="margin:0;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.55;">${esc(
        issue.essay.body,
      )}</p>
      <div style="margin-top:28px;padding-top:24px;border-top:1px solid ${LINE};">
        <p style="margin:0;color:${MUTED};font-family:${SANS};font-size:16px;">
          <strong style="color:${TEXT};">${esc(issue.essay.author)}</strong><br>${esc(
        issue.essay.authorRole,
      )}
        </p>
        <p style="margin:12px 0 0;"><a href="${esc(
          issue.essay.linkHref,
        )}" style="color:${TEXT};font-family:${SANS};font-size:16px;font-weight:600;text-decoration:underline;">${esc(
    issue.essay.linkText,
  )} ↗</a></p>
      </div>
    </div>
  </td></tr>`;

  const buildersMexicoItems =
    issue.buildersMexicoItems ??
    (issue.buildersMexico?.text
      ? [{ title: issue.buildersMexico.text, body: "", href: issue.buildersMexico.href }]
      : []);
  const buildersMexicoContent = buildersMexicoItems
    .filter((item) => item.title.trim() || item.body.trim())
    .map(
      (item) => `<div style="padding:4px 0 12px;margin-bottom:8px;">
        <h3 style="margin:0;font-family:${SANS};font-size:20px;font-weight:600;line-height:1.25;">
          <a class="title-link" href="${esc(item.href)}" style="color:${TEXT};text-decoration:none;">${esc(item.title)} ↗</a>
        </h3>
        <p style="margin:10px 0 0;color:${MUTED};font-family:${SANS};font-size:17px;line-height:1.55;">${esc(item.body)}</p>
      </div>`,
    )
    .join("");
  const buildersMexicoBlock = `<tr><td>${buildersMexicoContent}</td></tr>`;

  const communityTitle = [issue.community.title, issue.community.titleSuffix]
    .filter((part) => part.trim())
    .join(" ");
  const communityStatItems = issue.community.stats.filter((item) => item.trim());
  const communityStats = communityStatItems
    .map(
      (item, index) =>
        `<p style="margin:0 0 ${index === communityStatItems.length - 1 ? "0" : "10px"};color:${TEXT};font-family:${SANS};font-size:16px;line-height:1.5;"><strong>${String(index + 1).padStart(2, "0")}</strong>&nbsp;&nbsp;${esc(item)}</p>`,
    )
    .join("");
  const communityContent = Boolean(
    communityTitle.trim() || issue.community.body.trim() || communityStats,
  );
  const communityBlock = `<tr><td>
    <div style="padding:32px;border:1px solid ${LINE};border-radius:18px;background:${PANEL};">
      ${issue.community.label.trim() ? eyebrow(issue.community.label) : ""}
      ${communityTitle.trim() ? `<h3 style="margin:0 0 16px;font-family:${SANS};font-size:30px;font-weight:400;line-height:1.15;color:${TEXT};">${esc(communityTitle)}</h3>` : ""}
      ${issue.community.body.trim() ? `<p style="margin:0;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.55;">${esc(issue.community.body)}</p>` : ""}
      ${communityStats ? `<div style="margin-top:24px;padding-top:20px;border-top:1px solid ${LINE};">${communityStats}</div>` : ""}
    </div>
  </td></tr>`;

  // Sections render only when they carry content, and the "NN / TOTAL" counter
  // is computed from how many actually render — so an issue without an essay
  // shows "01 / 04" instead of a hardcoded "/ 05" with an empty card.
  const sections: Array<[string, string, boolean?]> = [];
  if (issue.stories.length)
    sections.push(["Esta semana en IA", `<tr><td>${stories}</td></tr>`, true]);
  if (issue.essay.title.trim()) sections.push(["Pensamiento de la semana", essayBlock]);
  if (issue.projects?.length)
    sections.push([
      issue.projectsLabel?.trim() || "Proyectos de la comunidad",
      `<tr><td>${projects}</td></tr>`,
    ]);
  if (issue.events.length)
    sections.push([
      issue.eventsLabel?.trim() || "Próximos eventos",
      `<tr><td>${events}</td></tr>`,
      true,
    ]);
  if (buildersMexicoContent)
    sections.push(["Desde AI Builders México", buildersMexicoBlock, true]);
  if (communityContent)
    sections.push(["Comunidad", communityBlock, true]);

  const sectionsHtml = sections
    .map(
      ([title, body, compact], index) =>
        (index > 0 ? hr() : "") + sectionHeader(title, compact) + body,
    )
    .join("\n");

  const sponsor = issue.sponsor;
  const sponsorDescription = sponsor?.description?.trim()
    ? `<p style="margin:5px 0 0;color:${MUTED};font-family:${SANS};font-size:14px;line-height:1.45;">${esc(sponsor.description)}</p>`
    : "";
  const sponsorContent = sponsor?.title.trim()
    ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:16px;font-weight:600;line-height:1.35;"><a href="${esc(
        sponsor.href,
      )}" style="color:${TEXT};text-decoration:underline;">${esc(sponsor.title)}</a></p>${sponsorDescription}`
    : "";
  const sponsorPlacement = `<tr><td style="padding:16px 0 8px;">
    <p style="margin:0;color:${QUIET};font-family:${MONO};font-size:10px;font-weight:500;line-height:1.4;text-transform:uppercase;">Publicidad &mdash; Patrocina <a href="https://vacantes.lat/checkout/ad-sponsor" style="color:${MUTED};text-decoration:underline;">este espacio</a></p>
    ${sponsorContent}
  </td></tr>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Declare both schemes so Apple Mail / iOS / Outlook-Mac do a clean, opt-in
     inversion of this light email instead of an aggressive forced one. Gmail /
     Outlook-Windows ignore this and run their own auto-darkening. -->
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(documentTitle)}</title>
<style>
  a.title-link:hover { text-decoration: underline !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(issue.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:32px 16px 64px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

  <tr><td style="padding:0;">
    <h1 style="margin:0;color:${TEXT};font-family:${SANS};font-size:38px;font-weight:600;line-height:1.1;">${esc(
      issue.title,
    )}</h1>
    <p style="margin:10px 0 0;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.4;">${esc(
      issue.subtitle,
    )}</p>
  </td></tr>

  <tr><td style="padding:18px 0 12px;">
    <span style="color:${QUIET};font-family:${MONO};font-size:13px;letter-spacing:normal;text-transform:uppercase;"><a href="https://aibuilders.lat" style="color:#2563eb;text-decoration:underline;">AI BUILDERS LATAM</a>${metadata ? ` &nbsp;·&nbsp; ${metadata}` : ""}</span>
  </td></tr>
  ${hr()}

  ${sponsorPlacement}

  ${sectionsHtml}

  ${hr()}
  <tr><td style="padding:32px 0 0;">
    <p style="margin:0 0 24px;color:${QUIET};font-family:${SANS};font-size:14px;line-height:1.5;">The Build Log es una curaduría semanal de AI BUILDERS LATAM.</p>
    <div style="margin:0 0 24px;color:${MUTED};font-family:${SANS};font-size:14px;line-height:1.5;">
      <p style="margin:0 0 8px;">¿Quieres promocionarte en The Build Log? <a href="https://vacantes.lat/checkout/ad-sponsor" style="color:#2563eb;text-decoration:underline;">Patrocina una edición</a>.</p>
      <p style="margin:0;">¿Buscas trabajo en IA? <a href="https://vacantes.lat" style="color:#2563eb;text-decoration:underline;">Explora vacantes</a>.</p>
    </div>
    <p style="margin:0;color:${QUIET};font-family:${MONO};font-size:12px;letter-spacing:normal;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${ACCENT};text-decoration:underline;">Cancelar suscripción</a>
      &nbsp;·&nbsp; <a href="https://aibuilders.lat" style="color:#2563eb;text-decoration:underline;">AI BUILDERS LATAM</a>
      &nbsp;·&nbsp; <a href="https://aibuilders.mx" style="color:#2563eb;text-decoration:underline;">AI BUILDERS MEXICO</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
<!-- First-party open pixel. Swapped for a signed per-contact URL at send time
     (lib/newsletter/tracking.ts); stripped in previews/tests. -->
<img src="{{{OPEN_PIXEL}}}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;overflow:hidden;">
</body>
</html>`;
}

export function renderBuildLog(issue: Issue): string {
  return renderIssue(issue.spanish ?? issue);
}
