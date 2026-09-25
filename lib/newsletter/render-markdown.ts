// Deliberately tiny markdown for standalone emails: escape everything first,
// then re-introduce a handful of constructs. Anything unrecognized stays as
// literal text — authors can't inject HTML, and email clients get inline styles.

export interface MarkdownStyle {
  p: string;
  h2: string;
  li: string;
  a: string;
  /** Returns the display width for an allowed image src, or null to leave the line literal. */
  imageWidth?: (src: string) => number | null;
}

const SAFE_HREF = /^(https?:\/\/|mailto:)[^\s"<>]+$/i;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emphasis(escaped: string): string {
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

// One level of balanced parentheses, so Wikipedia-style URLs survive.
const LINK = /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
const TOKEN = /\u0000(\d+)\u0000/g;
// An image is its own block: `![alt](src)` alone on a line.
export const IMAGE_LINE = /^!\[([^\]\n]*)\]\(([^()\s]+)\)$/;

// width attr for Outlook (ignores CSS); width:100% + max-width shrinks it on
// phones; display:block kills Gmail's gap under inline images.
function image(alt: string, src: string, width: number): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 20px;">`
    + `<img src="${esc(src)}" alt="${esc(alt)}" width="${width}" `
    + `style="display:block;width:100%;max-width:${width}px;height:auto;border:0;outline:none;text-decoration:none;border-radius:12px;">`
    + `</td></tr></table>`;
}

// Input is already escaped. Links become placeholder tokens while emphasis
// runs, so `*` inside a URL can never be rewritten into markup.
function inline(escaped: string, style: MarkdownStyle): string {
  const links: string[] = [];
  const withTokens = escaped.replace(LINK, (match, text: string, href: string) => {
    const raw = href.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    if (!SAFE_HREF.test(raw)) return match;
    // ' too: the tracking redirector only rewrites hrefs without quotes.
    links.push(`<a href="${esc(raw).replace(/'/g, "&#39;")}" style="${style.a}">${emphasis(text)}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  return emphasis(withTokens).replace(TOKEN, (_, index: string) => links[Number(index)]);
}

export function renderMarkdown(source: string, style: MarkdownStyle): string {
  // NUL is reserved for link placeholders in inline().
  const blocks = source.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    const img = lines.length === 1 ? IMAGE_LINE.exec(lines[0]) : null;
    const width = img && style.imageWidth ? style.imageWidth(img[2]) : null;
    if (img && width) {
      out.push(image(img[1].trim(), img[2], width));
    } else if (lines.length === 1 && lines[0].startsWith("## ")) {
      out.push(`<h2 style="${style.h2}">${inline(esc(lines[0].slice(3).trim()), style)}</h2>`);
    } else if (lines.every((line) => /^\s*-\s+/.test(line))) {
      const items = lines
        .map((line) => `<li style="${style.li}">${inline(esc(line.replace(/^\s*-\s+/, "")), style)}</li>`)
        .join("");
      out.push(`<ul style="margin:0 0 20px;padding-left:22px;">${items}</ul>`);
    } else {
      out.push(`<p style="${style.p}">${lines.map((line) => inline(esc(line), style)).join("<br>")}</p>`);
    }
  }
  return out.join("\n");
}
