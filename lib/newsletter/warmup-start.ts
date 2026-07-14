import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, newsletterIssues, newsletterWarmup } from "@/lib/db/schema";
import { SEED_TAG } from "./warmup";

const SEED_CONTACTS = [
  { email: "esteban@estebanconstante.com", name: "Esteban" },
  { email: "1996byk@gmail.com", name: "Ben Kim" },
  { email: "momillo@gmail.com", name: "Javi Rivero" },
] as const;

export class WarmupStartError extends Error {
  constructor(
    readonly code: "active_plan" | "invalid_config" | "issue_not_draft" | "issue_not_found",
    message: string,
  ) {
    super(message);
  }
}

export async function startWarmupPlan(
  issueId: string,
  options: {
    dailyCaps: readonly number[];
    chunkSize: number;
    replaceActive?: boolean;
  },
) {
  const dailyCaps = options.dailyCaps.map((cap) => Math.floor(cap));
  const chunkSize = Math.floor(options.chunkSize);
  if (
    !dailyCaps.length
    || dailyCaps.some((cap) => !Number.isFinite(cap) || cap <= 0)
    || !Number.isFinite(chunkSize)
    || chunkSize <= 0
  ) {
    throw new WarmupStartError("invalid_config", "La configuración de tandas no es válida.");
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('newsletter_warmup_active'))`);

    const [issue] = await tx
      .select({ id: newsletterIssues.id, slug: newsletterIssues.slug, status: newsletterIssues.status })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.id, issueId))
      .limit(1);
    if (!issue) throw new WarmupStartError("issue_not_found", "Issue no encontrado.");
    const resumable = options.replaceActive && issue.status === "sending";
    if (issue.status !== "draft" && !resumable) {
      throw new WarmupStartError("issue_not_draft", "Este issue ya no es un borrador editable.");
    }

    const [activePlan] = await tx
      .select({ id: newsletterWarmup.id })
      .from(newsletterWarmup)
      .where(eq(newsletterWarmup.active, true))
      .orderBy(asc(newsletterWarmup.createdAt))
      .limit(1);
    if (activePlan && !options.replaceActive) {
      throw new WarmupStartError("active_plan", "Ya hay un envío por tandas activo.");
    }
    if (activePlan) {
      await tx
        .update(newsletterWarmup)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(newsletterWarmup.active, true));
    }

    for (const seed of SEED_CONTACTS) {
      await tx
        .insert(contacts)
        .values({
          email: seed.email,
          name: seed.name,
          newsletterSubscribed: true,
          tags: [SEED_TAG],
          sources: ["newsletter-seed"],
        })
        .onConflictDoUpdate({
          target: contacts.email,
          set: {
            newsletterSubscribed: true,
            tags: sql`(select array(select distinct unnest(${contacts.tags} || array[${SEED_TAG}]::text[])))`,
            updatedAt: new Date(),
          },
        });
    }

    const [plan] = await tx
      .insert(newsletterWarmup)
      .values({ issueId, dailyCaps, chunkSize, startAt: new Date(), active: true })
      .returning({ id: newsletterWarmup.id });
    await tx
      .update(newsletterIssues)
      .set({ status: "sending", sentAt: null, updatedAt: new Date() })
      .where(eq(newsletterIssues.id, issueId));

    const [{ audienceCount }] = await tx
      .select({ audienceCount: sql<number>`count(*)::int` })
      .from(contacts)
      .where(eq(contacts.newsletterSubscribed, true));

    return {
      planId: plan.id,
      issueSlug: issue.slug,
      audienceCount,
      dailyCaps,
      chunkSize,
    };
  });
}
