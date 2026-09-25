import { parseImageFileName } from "@/lib/newsletter/image-url";
import { loadImage } from "@/lib/newsletter/images";

export const runtime = "nodejs";

// Public, immutable: an image id never changes content (uploads are new rows).
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const ref = parseImageFileName((await params).file);
  if (!ref) return new Response("Not found", { status: 404 });
  const image = await loadImage(ref.id);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
