import {
  BG,
  LINE,
  MONO,
  MUTED,
  PANEL,
  QUIET,
  SANS,
  TEXT,
  esc,
  hr,
  legalFooterLinks,
  OPEN_PIXEL_TAG,
} from "./email-style";
import type { AdPlacement, BaseIssue, Issue } from "./types";

function eyebrow(text: string): string {
  return `<p style="margin:0 0 18px;color:${QUIET};font-family:${MONO};font-size:13px;font-weight:500;letter-spacing:normal;text-transform:uppercase;">${esc(
    text,
  )}</p>`;
}

function eventLocation(label: string): string {
  const location = label.replace(/^(AI BUILDERS|AIBM)\s*[-·]\s*/i, "").trim();
  return /^ONLINE$/i.test(location) ? "VIRTUAL" : location || "VIRTUAL";
}

type SectionAnchor = "stories" | "essay" | "projects" | "events" | "builders" | "community";

function insertSponsor(
  rendered: string[],
  anchors: SectionAnchor[],
  placement: AdPlacement | undefined,
  block: string,
): string {
  const body = rendered.join("\n");
  const resolved = placement ?? "top";
  if (resolved === "before_footer") return body ? `${body}\n${block}` : block;
  if (resolved === "top") return body ? `${block}\n${body}` : block;

  const anchor = resolved === "after_stories" ? "stories" : "essay";
  const index = anchors.indexOf(anchor);
  // A missing section has nowhere to follow, so the slot stays at the top.
  if (index === -1) return body ? `${block}\n${body}` : block;
  const before = rendered.slice(0, index + 1).join("\n");
  const after = rendered.slice(index + 1).join("\n");
  return after ? `${before}\n${block}\n${after}` : `${before}\n${block}`;
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
  const sections: Array<{ anchor: SectionAnchor; title: string; body: string; compact?: boolean }> = [];
  if (issue.stories.length)
    sections.push({ anchor: "stories", title: "Esta semana en IA", body: `<tr><td>${stories}</td></tr>`, compact: true });
  if (issue.essay.title.trim()) sections.push({ anchor: "essay", title: "Pensamiento de la semana", body: essayBlock });
  if (issue.projects?.length)
    sections.push({
      anchor: "projects",
      title: issue.projectsLabel?.trim() || "Proyectos de la comunidad",
      body: `<tr><td>${projects}</td></tr>`,
    });
  if (issue.events.length)
    sections.push({
      anchor: "events",
      title: issue.eventsLabel?.trim() || "Próximos eventos",
      body: `<tr><td>${events}</td></tr>`,
      compact: true,
    });
  if (buildersMexicoContent)
    sections.push({ anchor: "builders", title: "Desde AI Builders México", body: buildersMexicoBlock, compact: true });
  if (communityContent)
    sections.push({ anchor: "community", title: "Comunidad", body: communityBlock, compact: true });

  const renderedSections = sections.map(
    (section, index) =>
      (index > 0 ? hr(32) : "") + sectionHeader(section.title, section.compact) + section.body,
  );

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
  const bodyWithSponsor = insertSponsor(
    renderedSections,
    sections.map((section) => section.anchor),
    issue.adPlacement,
    sponsorPlacement,
  );

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

  ${bodyWithSponsor}

  ${hr(40)}
  <tr><td style="padding:32px 0 0;">
    <p style="margin:0 0 24px;color:${QUIET};font-family:${SANS};font-size:14px;line-height:1.5;">The Build Log es una curaduría semanal de AI BUILDERS LATAM.</p>
    <div style="margin:0 0 24px;color:${MUTED};font-family:${SANS};font-size:14px;line-height:1.5;">
      <p style="margin:0 0 8px;">¿Quieres promocionarte en The Build Log? <a href="https://vacantes.lat/checkout/ad-sponsor" style="color:#2563eb;text-decoration:underline;">Patrocina una edición</a>.</p>
      <p style="margin:0;">¿Buscas trabajo en IA? <a href="https://vacantes.lat" style="color:#2563eb;text-decoration:underline;">Explora vacantes</a>.</p>
    </div>
    ${legalFooterLinks()}
  </td></tr>

</table>
</td></tr>
</table>
${OPEN_PIXEL_TAG}
</body>
</html>`;
}

export function renderBuildLog(issue: Issue): string {
  return renderIssue(issue.spanish ?? issue);
}
