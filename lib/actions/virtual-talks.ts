"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { virtualTalks } from "@/lib/db/schema";
import type { VirtualTalkCard } from "@/lib/virtual-talks";

const ADMIN_PATH = "/admin/talks";
const PUBLIC_PATH = "/talks";

async function gate(): Promise<boolean> {
  return Boolean(await getUser());
}

function isMissingTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function clean(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function revalidateTalks(): void {
  revalidatePath(ADMIN_PATH);
  revalidatePath(PUBLIC_PATH);
}

export async function listVirtualTalksForAdmin(): Promise<VirtualTalkCard[]> {
  if (!(await gate())) return [];

  try {
    return await db
      .select({
        id: virtualTalks.id,
        title: virtualTalks.title,
        body: virtualTalks.body,
        meta: virtualTalks.meta,
        href: virtualTalks.href,
        position: virtualTalks.position,
        published: virtualTalks.published,
      })
      .from(virtualTalks)
      .orderBy(asc(virtualTalks.position), asc(virtualTalks.createdAt));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function createVirtualTalk(formData: FormData): Promise<void> {
  if (!(await gate())) return;

  const title = clean(formData.get("title"));
  const href = clean(formData.get("href"));
  if (!title || !href) return;

  const [last] = await db
    .select({ position: virtualTalks.position })
    .from(virtualTalks)
    .orderBy(desc(virtualTalks.position))
    .limit(1);

  await db
    .insert(virtualTalks)
    .values({
      title,
      href,
      meta: clean(formData.get("meta")) || "Virtual Talk",
      body: clean(formData.get("body")),
      position: (last?.position ?? 0) + 10,
      published: true,
    })
    .onConflictDoNothing({ target: virtualTalks.href });

  revalidateTalks();
}

export async function updateVirtualTalk(formData: FormData): Promise<void> {
  if (!(await gate())) return;

  const id = clean(formData.get("id"));
  const title = clean(formData.get("title"));
  const href = clean(formData.get("href"));
  if (!id || !title || !href) return;

  await db
    .update(virtualTalks)
    .set({
      title,
      href,
      meta: clean(formData.get("meta")) || "Virtual Talk",
      body: clean(formData.get("body")),
      updatedAt: new Date(),
    })
    .where(eq(virtualTalks.id, id));

  revalidateTalks();
}

export async function toggleVirtualTalkPublished(formData: FormData): Promise<void> {
  if (!(await gate())) return;

  const id = clean(formData.get("id"));
  const published = clean(formData.get("published")) === "true";
  if (!id) return;

  await db
    .update(virtualTalks)
    .set({ published, updatedAt: new Date() })
    .where(eq(virtualTalks.id, id));

  revalidateTalks();
}

export async function deleteVirtualTalk(formData: FormData): Promise<void> {
  if (!(await gate())) return;

  const id = clean(formData.get("id"));
  if (!id) return;

  await db.delete(virtualTalks).where(eq(virtualTalks.id, id));
  revalidateTalks();
}

export async function moveVirtualTalk(formData: FormData): Promise<void> {
  if (!(await gate())) return;

  const id = clean(formData.get("id"));
  const direction = clean(formData.get("direction"));
  if (!id || (direction !== "up" && direction !== "down")) return;

  const [current] = await db.select().from(virtualTalks).where(eq(virtualTalks.id, id)).limit(1);
  if (!current) return;

  const [neighbor] =
    direction === "up"
      ? await db
          .select()
          .from(virtualTalks)
          .where(lt(virtualTalks.position, current.position))
          .orderBy(desc(virtualTalks.position))
          .limit(1)
      : await db
          .select()
          .from(virtualTalks)
          .where(gt(virtualTalks.position, current.position))
          .orderBy(asc(virtualTalks.position))
          .limit(1);

  if (!neighbor) return;

  await db.transaction(async (tx) => {
    await tx
      .update(virtualTalks)
      .set({ position: sql`case
        when ${virtualTalks.id} = ${current.id} then ${neighbor.position}
        when ${virtualTalks.id} = ${neighbor.id} then ${current.position}
        else ${virtualTalks.position}
      end` })
      .where(sql`${virtualTalks.id} in (${current.id}, ${neighbor.id})`);
  });

  revalidateTalks();
}
