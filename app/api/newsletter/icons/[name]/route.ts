import { rasterizePhosphor, isIconVariant, UnknownIconError } from "@/lib/newsletter/icons";

// GET /api/newsletter/icons/<phosphor-name>.png?variant=light|dark
// Rasterizes a Phosphor icon to a PNG on demand (used by newsletter emails,
// which can't render inline SVG). `variant` picks the tone — dark glyph for
// light surfaces (default), light glyph for dark surfaces. Heavily cacheable:
// (name, variant) always maps to the same image, so Gmail's proxy fetches once.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const clean = name.replace(/\.png$/i, "");
  const v = new URL(req.url).searchParams.get("variant");
  const variant = v && isIconVariant(v) ? v : "dark";

  try {
    const png = await rasterizePhosphor(clean, variant);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    if (e instanceof UnknownIconError) {
      return new Response(e.message, { status: 404 });
    }
    throw e;
  }
}
