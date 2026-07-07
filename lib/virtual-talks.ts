import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { virtualTalks } from "@/lib/db/schema";

export interface VirtualTalkCard {
  id: string;
  title: string;
  body: string;
  meta: string;
  href: string;
  position: number;
  published: boolean;
}

function isMissingTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function listPublishedVirtualTalks(): Promise<VirtualTalkCard[]> {
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
      .where(eq(virtualTalks.published, true))
      .orderBy(asc(virtualTalks.position), asc(virtualTalks.createdAt));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}
