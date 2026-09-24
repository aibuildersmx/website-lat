// Deliberately tiny markdown for standalone emails: escape everything first,
// then re-introduce a handful of constructs. Anything unrecognized stays as
// literal text — authors can't inject HTML, and email clients get inline styles.

export interface MarkdownStyle {
  p: string;
  h2: string;
  li: string;
  a: string;
}

const SAFE_HREF = /^(https?:\/\/|mailto:)[^\s"<>]+$/i;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Input is already escaped. Links first so their text can still carry emphasis.
function inline(escaped: string, style: MarkdownStyle): string {
  return escaped
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, text: string, href: string) => {
      const raw = href.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      return SAFE_HREF.test(raw) ? `<a href="${esc(raw)}" style="${style.a}">${text}</a>` : match;
    })
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

export function renderMarkdown(source: string, style: MarkdownStyle): string {
  const blocks = source.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    if (lines.length === 1 && lines[0].startsWith("## ")) {
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
