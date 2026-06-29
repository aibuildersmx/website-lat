// Import a newsletter issue from a prepared Issue JSON file: validate it, wrap all
// outbound links through our /r redirector, and upsert it as a DRAFT in Railway.
// This is the mechanical half of the "HTML -> issue" flow; the judgment half
// (parsing the HTML into the Issue JSON) is done by hand/agent per the
// newsletter-from-html skill. Run after writing the JSON:
//
//   set -a && . ./.env.local && set +a
//   pnpm tsx scripts/newsletter/import-issue.ts /tmp/issue-003.json
//
// It NEVER sends — it only creates/updates the draft. Sending stays a separate,
// deliberate step (canary via test-send.ts, then start-warmup.ts).

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

async function main() {
  const { positionals } = parseArgs({ allowPositionals: true });
  const file = positionals[0];
  if (!file) {
    console.error("Usage: pnpm tsx scripts/newsletter/import-issue.ts <issue.json>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run: set -a && . ./.env.local && set +a");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error("RESEND_API_KEY is not set (needed to sign /r links). Source .env.local.");
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const { newsletterIssues } = await import("../../lib/db/schema");
  const { wrapLink } = await import("../../lib/newsletter/links");
  const type = await import("../../lib/newsletter/types");
  void type; // type-only import for editors; no runtime use

  let issue: import("../../lib/newsletter/types").Issue;
  try {
    issue = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`No pude leer/parsear ${file}: ${(e as Error).message}`);
    process.exit(1);
  }

  // --- validate the judgment-half got the non-obvious bits right -------------
  const errors: string[] = [];
  if (!issue.slug?.trim()) errors.push("Falta `slug` (ej. \"003\").");
  if (!issue.subject?.trim()) errors.push("Falta `subject` (frase descriptiva, NO \"Issue 003\").");
  if (!issue.stories?.length) errors.push("Necesita al menos una historia en `stories`.");
  // Icons MUST be Phosphor kebab-case names, not glyphs/emoji — the email renders
  // them as PNGs (lib/newsletter/icons.ts). A glyph here = a broken image.
  for (const [i, u] of (issue.useCases ?? []).entries()) {
    if (u.icon && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(u.icon)) {
      errors.push(
        `useCases[${i}].icon = "${u.icon}" no es un nombre Phosphor válido. ` +
          `Usa kebab-case (ej. "git-fork", "repeat", "cpu"). Ver https://phosphoricons.com.`,
      );
    }
  }
  if (errors.length) {
    console.error("Issue inválido:\n  - " + errors.join("\n  - "));
    process.exit(1);
  }

  // --- wrap every outbound link through /r (mailto/relative left untouched) ---
  let wrapped = 0;
  const wrap = (href: string | undefined) => {
    if (!href) return href;
    const out = wrapLink(href);
    if (out !== href) wrapped++;
    return out;
  };
  issue.stories = issue.stories.map((s) => ({ ...s, href: wrap(s.href) ?? s.href }));
  issue.projects = (issue.projects ?? []).map((p) => ({ ...p, href: wrap(p.href) ?? p.href }));
  issue.events = (issue.events ?? []).map((e) => ({ ...e, href: wrap(e.href) ?? e.href }));
  issue.jobs = (issue.jobs ?? []).map((j) => ({ ...j, href: wrap(j.href) ?? j.href }));
  if (issue.essay?.linkHref) issue.essay.linkHref = wrap(issue.essay.linkHref) ?? issue.essay.linkHref;

  // --- upsert as a draft -----------------------------------------------------
  const { sql } = await import("drizzle-orm");
  const [row] = await db
    .insert(newsletterIssues)
    .values({ slug: issue.slug, subject: issue.subject, status: "draft", data: issue })
    .onConflictDoUpdate({
      target: newsletterIssues.slug,
      set: { subject: issue.subject, data: issue, updatedAt: sql`now()` },
    })
    .returning({ id: newsletterIssues.id, slug: newsletterIssues.slug });

  console.log(`✅ Draft listo — issue ${row.slug} (id ${row.id})`);
  console.log(`   Links envueltos por /r: ${wrapped}`);
  console.log(`   Revisa en /admin/newsletter/${row.id}`);
  console.log(`   Prueba:  pnpm tsx scripts/newsletter/test-send.ts --from ${row.slug} --emails "tu@correo.com"`);
  console.log(`   Enviar:  pnpm tsx scripts/newsletter/start-warmup.ts ${row.id}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
