import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterImages } from "@/lib/db/schema";
import { imageUrl, type ImageRef } from "./image-url";
import { processImage } from "./image-process";

export interface StoredImage {
  url: string;
  width: number;
  height: number;
  bytes: number;
  contentType: string;
}

export async function storeImage(
  input: Buffer,
  owner: { tokenId?: string; userId?: string },
): Promise<StoredImage> {
  const image = await processImage(input);
  const sha256 = createHash("sha256").update(image.data).digest("hex");
  await db
    .insert(newsletterImages)
    .values({
      contentType: image.contentType,
      data: image.data,
      width: image.width,
      height: image.height,
      sha256,
      tokenId: owner.tokenId,
      userId: owner.userId,
    })
    .onConflictDoNothing({ target: newsletterImages.sha256 });
  const [row] = await db
    .select({ id: newsletterImages.id, width: newsletterImages.width, height: newsletterImages.height, contentType: newsletterImages.contentType })
    .from(newsletterImages)
    .where(eq(newsletterImages.sha256, sha256))
    .limit(1);
  const ref: ImageRef = { id: row.id, width: row.width, height: row.height, ext: row.contentType === "image/png" ? "png" : "jpg" };
  return { url: imageUrl(ref), width: row.width, height: row.height, bytes: image.data.length, contentType: row.contentType };
}

export async function loadImage(id: string): Promise<{ data: Buffer; contentType: string } | null> {
  const [row] = await db
    .select({ data: newsletterImages.data, contentType: newsletterImages.contentType })
    .from(newsletterImages)
    .where(eq(newsletterImages.id, id))
    .limit(1);
  return row ?? null;
}

export { ImageUploadError, imageMarkdown, readUpload } from "./image-process";
