// Throwaway end-to-end test of the newsletter sending queue.
//
// Clones a real draft issue into a disposable TEST issue, then sends it through
// the REAL queue (pg-boss) to a small list of controlled inboxes — so the live
// Railway worker renders + delivers via Resend exactly as a real send would,
// WITHOUT touching the real issue's send lifecycle or the 2,256 subscribers.
//
// The test recipients are upserted as contacts tagged `test` / source
// `newsletter-test` and `newsletter_subscribed=false`, so they never join a real
// send. Pre-existing real contacts are reused untouched (and never deleted on
// cleanup).
//
//   # send the test (clones issue 001 to a test issue, enqueues to the 3 inboxes)
//   set -a && . ./.env.local && set +a && pnpm tsx scripts/newsletter/test-send.ts
//
//   # custom source issue / recipients
//   ... test-send.ts --from 001 --emails "a@x.com,b@y.com"
//
//   # cleanup afterward (deletes the test issue + its test contacts/sends)
//   ... test-send.ts --cleanup <testIssueId>

import { parseArgs } from "node:util";

const DEFAULT_EMAILS = [
  "1996byk@gmail.com", // Ben Kim
  "momillo@gmail.com", // Javi Rivero
  "esteban@estebanconstante.com", // Esteban
];

const TEST_SOURCE = "newsletter-test"; // marker so cleanup only removes our test contacts

async function main() {
  const { values } = parseArgs({
    options: {
      from: { type: "string", default: "001" }, // source issue slug to clone
      emails: { type: "string" }, // comma/space separated; defaults to the 3 above
      cleanup: { type: "string" }, // test issue id to tear down
    },
  });

  // Friendly preflight — lib/db/client throws a bare error at module load.
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL is not set. For a local run:\n" +
        "  set -a && . ./.env.local && set +a\n" +
        "then re-run.",
    );
    process.exit(1);
  }

  // Lazy-load DB/queue so the preflight above can fail cleanly first.
  const { db } = await import("../../lib/db/client");
  const schema = await import("../../lib/db/schema");
  const { eq, and, inArray, sql } = await import("drizzle-orm");

  if (values.cleanup) {
    const testIssueId = values.cleanup;
    const sends = await db
      .select({ contactId: schema.newsletterSends.contactId })
      .from(schema.newsletterSends)
      .where(eq(schema.newsletterSends.issueId, testIssueId));
    const ids = sends.map((s) => s.contactId);

    const delIssue = await db
      .delete(schema.newsletterIssues)
      .where(eq(schema.newsletterIssues.id, testIssueId))
      .returning({ slug: schema.newsletterIssues.slug }); // cascades its sends

    let delContacts: { email: string }[] = [];
    if (ids.length) {
      delContacts = await db
        .delete(schema.contacts)
        .where(
          and(
            inArray(schema.contacts.id, ids),
            sql`${TEST_SOURCE} = any(${schema.contacts.sources})`,
          ),
        )
        .returning({ email: schema.contacts.email });
    }

    if (!delIssue.length) {
      console.error(`No se encontró un issue con id ${testIssueId}.`);
      process.exit(1);
    }
    console.log(`Cleanup OK: issue ${delIssue[0].slug} borrado.`);
    console.log(`Contactos de prueba borrados: ${delContacts.length} (${delContacts.map((c) => c.email).join(", ") || "ninguno"}).`);
    console.log("(Contactos reales reutilizados quedaron intactos.)");
    process.exit(0);
  }

  // --- Send flow ------------------------------------------------------------
  const emails = (values.emails ? values.emails.split(/[\s,;]+/) : DEFAULT_EMAILS)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (!emails.length) {
    console.error("No hay correos válidos para el test.");
    process.exit(1);
  }

  // 1. Load the source issue to clone.
  const [source] = await db
    .select()
    .from(schema.newsletterIssues)
    .where(eq(schema.newsletterIssues.slug, values.from!))
    .limit(1);
  if (!source) {
    console.error(`No existe un issue con slug "${values.from}".`);
    process.exit(1);
  }
  if (!source.data.subject?.trim() || !source.data.stories?.length) {
    console.error("El issue fuente necesita subject y al menos una historia.");
    process.exit(1);
  }

  // 2. Create a disposable test issue with identical content.
  const stamp = Date.now();
  const testSlug = `test-${stamp}`;
  const testData = {
    ...source.data,
    slug: testSlug,
    subject: `[PRUEBA] ${source.data.subject}`,
  };
  const [testIssue] = await db
    .insert(schema.newsletterIssues)
    .values({ slug: testSlug, subject: testData.subject, status: "sending", data: testData })
    .returning({ id: schema.newsletterIssues.id });

  // 3. Upsert the recipients as test contacts (existing real ones are left as-is).
  await db
    .insert(schema.contacts)
    .values(
      emails.map((email) => ({
        email,
        newsletterSubscribed: false,
        tags: ["test"],
        sources: [TEST_SOURCE],
      })),
    )
    .onConflictDoNothing({ target: schema.contacts.email });

  const recipients = await db
    .select({ id: schema.contacts.id, email: schema.contacts.email })
    .from(schema.contacts)
    .where(inArray(schema.contacts.email, emails));

  // 4. One pending send row per recipient (idempotent).
  await db
    .insert(schema.newsletterSends)
    .values(recipients.map((r) => ({ issueId: testIssue.id, contactId: r.id, status: "pending" as const })))
    .onConflictDoNothing({
      target: [schema.newsletterSends.issueId, schema.newsletterSends.contactId],
    });

  // 5. Enqueue a single batch to the REAL queue — the Railway worker drains it.
  const { getBoss, SEND_BATCH_QUEUE } = await import("../../lib/queue/boss");
  const boss = await getBoss();
  await boss.send(SEND_BATCH_QUEUE, {
    issueId: testIssue.id,
    contactIds: recipients.map((r) => r.id),
  });

  console.log("✅ Test encolado por la cola real.");
  console.log(`   Issue de prueba: ${testIssue.id}  (slug ${testSlug})`);
  console.log(`   Destinatarios (${recipients.length}): ${recipients.map((r) => r.email).join(", ")}`);
  console.log("");
  console.log("Verifica:");
  console.log("  1. Llegan los correos con subject '[PRUEBA] …' a las 3 bandejas.");
  console.log("  2. El link de baja del footer abre /unsubscribe sin error.");
  console.log("  3. En /admin/newsletter el issue de prueba muestra el progreso y termina en 'Enviado'.");
  console.log("  4. Reenviar este script NO duplica correos (idempotencia).");
  console.log("");
  console.log("Cuando termines, limpia con:");
  console.log(`  set -a && . ./.env.local && set +a && pnpm tsx scripts/newsletter/test-send.ts --cleanup ${testIssue.id}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
