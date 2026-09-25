import sharp from "sharp";
import type { ImageExt } from "./image-url";

// Uploads are normalized for email: 1200px wide max (2x the 600px column, so
// retina stays sharp), EXIF orientation applied and metadata stripped, and
// re-encoded as JPEG — or PNG when the source has transparency. No WebP or
// SVG: Outlook and Gmail don't render them reliably.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1200;
const INPUT_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"]);

export class ImageUploadError extends Error {
  constructor(readonly code: "empty" | "too_large" | "unsupported", message: string) {
    super(message);
  }
}

export interface ProcessedImage {
  data: Buffer;
  contentType: string;
  ext: ImageExt;
  width: number;
  height: number;
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageUploadError("empty", "The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ImageUploadError("too_large", "The image is larger than 5 MB.");
  }
  const options = { limitInputPixels: 60_000_000 };
  let format: string | undefined;
  let hasAlpha = false;
  try {
    const meta = await sharp(input, options).metadata();
    format = meta.format;
    hasAlpha = !!meta.hasAlpha;
  } catch {
    throw new ImageUploadError("unsupported", "The file is not an image.");
  }
  if (!format || !INPUT_FORMATS.has(format)) {
    throw new ImageUploadError("unsupported", "Use JPG, PNG, WebP, GIF, AVIF, or HEIC. SVG is not supported in email.");
  }

  const base = sharp(input, options).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const encoded = hasAlpha
    ? base.png({ compressionLevel: 9, palette: true, quality: 90 })
    : base.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true, progressive: true });
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  return {
    data,
    contentType: hasAlpha ? "image/png" : "image/jpeg",
    ext: hasAlpha ? "png" : "jpg",
    width: info.width,
    height: info.height,
  };
}

/**
 * Reads an upload from either a raw body (`curl --data-binary @file`) or a
 * multipart form field named `file` (`curl -F file=@file`, browser FormData).
 */
export async function readUpload(request: Request): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw new ImageUploadError("too_large", "The image is larger than 5 MB.");
  }
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (type.startsWith("multipart/form-data")) {
    const file = (await request.formData()).get("file");
    if (!file || typeof file === "string") throw new ImageUploadError("empty", "Send the image in a form field named file.");
    if (file.size > MAX_UPLOAD_BYTES) throw new ImageUploadError("too_large", "The image is larger than 5 MB.");
    return Buffer.from(await file.arrayBuffer());
  }
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length > MAX_UPLOAD_BYTES) throw new ImageUploadError("too_large", "The image is larger than 5 MB.");
  return body;
}

export function imageMarkdown(url: string, alt = "descripción de la imagen"): string {
  return `![${alt.replace(/[\[\]\n]/g, " ").trim() || "imagen"}](${url})`;
}
