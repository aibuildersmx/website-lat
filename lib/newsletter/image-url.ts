import { siteUrl } from "./unsubscribe";

// Email images are only ever served from our own /img route. The dimensions
// live in the URL so the (pure) renderer can emit an Outlook-safe width
// attribute without touching the database.

export const EMAIL_COLUMN_WIDTH = 600;

export type ImageExt = "jpg" | "png";

export interface ImageRef {
  id: string;
  width: number;
  height: number;
  ext: ImageExt;
}

const FILE_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d{1,5})x(\d{1,5})\.(jpg|png)$/;

export function imageFileName(ref: ImageRef): string {
  return `${ref.id}-${ref.width}x${ref.height}.${ref.ext}`;
}

export function imageUrl(ref: ImageRef): string {
  return `${siteUrl()}/img/${imageFileName(ref)}`;
}

export function parseImageFileName(file: string): ImageRef | null {
  const match = FILE_RE.exec(file);
  if (!match) return null;
  const width = Number(match[2]);
  const height = Number(match[3]);
  if (!width || !height) return null;
  return { id: match[1], width, height, ext: match[4] as ImageExt };
}

/** Accepts only `${siteUrl()}/img/<file>` — nothing hotlinked from elsewhere. */
export function parseImageUrl(url: string): ImageRef | null {
  const prefix = `${siteUrl()}/img/`;
  if (!url.startsWith(prefix)) return null;
  return parseImageFileName(url.slice(prefix.length));
}

/** Width the email shows it at: full column, or natural size if narrower. */
export function displayWidth(ref: ImageRef): number {
  return Math.min(EMAIL_COLUMN_WIDTH, ref.width);
}
