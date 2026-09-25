import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import sharp from "sharp";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

d("newsletter images storage", () => {
  const ids: string[] = [];

  afterAll(async () => {
    const { db } = await import("../../lib/db/client");
    const schema = await import("../../lib/db/schema");
    if (ids.length) await db.delete(schema.newsletterImages).where(inArray(schema.newsletterImages.id, ids));
  });

  it("stores once per processed file and serves it from /img", async () => {
    const { storeImage } = await import("../../lib/newsletter/images");
    const { parseImageUrl } = await import("../../lib/newsletter/image-url");
    const { GET } = await import("../../app/img/[file]/route");
    const file = await sharp({ create: { width: 1600, height: 900, channels: 3, background: `#${process.pid.toString(16).padStart(6, "0").slice(-6)}` } }).jpeg().toBuffer();

    const first = await storeImage(file, {});
    const again = await storeImage(file, {});
    expect(again.url).toBe(first.url);
    expect(first).toMatchObject({ width: 1200, height: 675, contentType: "image/jpeg" });
    const ref = parseImageUrl(first.url)!;
    ids.push(ref.id);

    const name = first.url.split("/img/")[1];
    const res = await GET(new Request(first.url), { params: Promise.resolve({ file: name }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width).toBe(1200);

    const missing = await GET(new Request(first.url), { params: Promise.resolve({ file: "nope.jpg" }) });
    expect(missing.status).toBe(404);
  });
});
