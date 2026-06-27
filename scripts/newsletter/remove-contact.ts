// Remove contacts by email — deletes the contact rows (cascades to their
// newsletter_sends), so they're excluded from any remaining send tandas.
//   pnpm tsx --env-file=.env.local scripts/newsletter/remove-contact.ts <email> [email2 ...]
import { parseArgs } from "node:util";

async function main() {
  const { positionals } = parseArgs({ allowPositionals: true, options: {} });
  const emails = positionals.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) {
    console.error("Usage: remove-contact.ts <email> [email2 ...]");
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const { contacts } = await import("../../lib/db/schema");
  const { inArray } = await import("drizzle-orm");

  const found = await db
    .select({ id: contacts.id, email: contacts.email })
    .from(contacts)
    .where(inArray(contacts.email, emails));

  const foundEmails = new Set(found.map((r) => r.email));
  const missing = emails.filter((e) => !foundEmails.has(e));

  if (found.length) {
    await db.delete(contacts).where(inArray(contacts.email, emails));
  }
  console.log(`Eliminados ${found.length} contacto(s): ${found.map((r) => r.email).join(", ") || "(ninguno)"}.`);
  if (missing.length) console.log(`No existían: ${missing.join(", ")}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
