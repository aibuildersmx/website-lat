import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ImageUploadError, imageMarkdown, readUpload, storeImage } from "@/lib/newsletter/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Upload from the standalone editor. A route handler, not a server action:
// server actions cap request bodies at 1 MB.
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const image = await storeImage(await readUpload(request), { userId: user.id });
    return NextResponse.json({ ...image, markdown: imageMarkdown(image.url) });
  } catch (cause) {
    if (cause instanceof ImageUploadError) {
      return NextResponse.json({ error: cause.message }, { status: cause.code === "too_large" ? 413 : 400 });
    }
    throw cause;
  }
}
