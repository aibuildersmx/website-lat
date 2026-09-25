import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { displayWidth, imageUrl, parseImageUrl } from "@/lib/newsletter/image-url";
import { imageMarkdown, processImage } from "@/lib/newsletter/image-process";
import { standaloneWarnings } from "@/lib/newsletter/preview";
import { renderMarkdown } from "@/lib/newsletter/render-markdown";
import { renderStandalone } from "@/lib/newsletter/render-standalone";
import { validateStandalone } from "@/lib/newsletter/validation";

const ID = "3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b";
const own = imageUrl({ id: ID, width: 1200, height: 675, ext: "jpg" });
const email = (body: string) => ({ slug: "s-abc12345", subject: "S", preview: "P", title: "T", body });

function solid(width: number, height: number, alpha = false) {
  return sharp({
    create: { width, height, channels: alpha ? 4 : 3, background: alpha ? { r: 0, g: 0, b: 0, alpha: 0.5 } : "#336699" },
  });
}

describe("image URLs", () => {
  it("round-trips our own URLs and rejects anything else", () => {
    expect(parseImageUrl(own)).toEqual({ id: ID, width: 1200, height: 675, ext: "jpg" });
    expect(parseImageUrl(`https://evil.example/img/${ID}-1200x675.jpg`)).toBeNull();
    expect(parseImageUrl(own.replace(".jpg", ".svg"))).toBeNull();
    expect(parseImageUrl(`${own}?x=1`)).toBeNull();
  });

  it("shows wide images at the 600px column and small ones at natural size", () => {
    expect(displayWidth({ id: ID, width: 1200, height: 1, ext: "jpg" })).toBe(600);
    expect(displayWidth({ id: ID, width: 240, height: 1, ext: "png" })).toBe(240);
  });
});

describe("image rendering", () => {
  const style = { p: "P", h2: "H", li: "L", a: "A", imageWidth: (src: string) => (src === own ? 600 : null) };

  it("renders an image paragraph as a responsive, Outlook-safe img", () => {
    const html = renderMarkdown(`Hola\n\n![Foto del "hackathon"](${own})\n\nAdiós`, style);
    expect(html).toContain(`<img src="${own}" alt="Foto del &quot;hackathon&quot;" width="600"`);
    expect(html).toContain("display:block;width:100%;max-width:600px;height:auto;border:0;");
  });

  it("leaves disallowed or inline images as literal text", () => {
    expect(renderMarkdown("![x](https://evil.example/a.jpg)", style)).not.toContain("<img");
    expect(renderMarkdown(`texto ![x](${own})`, style)).not.toContain("<img");
    expect(renderMarkdown(`![x](${own})`, { p: "P", h2: "H", li: "L", a: "A" })).not.toContain("<img");
  });

  it("renderStandalone accepts uploaded images only", () => {
    expect(renderStandalone(email(`![Foto](${own})`))).toContain('width="600"');
    expect(renderStandalone(email("![Foto](https://evil.example/a.jpg)"))).not.toContain('alt="Foto"');
  });
});

describe("image validation and warnings", () => {
  it("accepts an uploaded image with alt text in its own paragraph", () => {
    expect(validateStandalone(email(`Texto\n\n![Foto](${own})\n\nMás texto`)).errors).toBeUndefined();
  });

  it("rejects external hosts, missing alt text, and inline images", () => {
    expect(validateStandalone(email("![Foto](https://evil.example/a.jpg)")).errors?.[0]).toContain("subida a AI Builders");
    expect(validateStandalone(email(`![](${own})`)).errors?.[0]).toContain("texto alternativo");
    expect(validateStandalone(email(`Mira ![Foto](${own})`)).errors?.[0]).toContain("sola en su párrafo");
    expect(validateStandalone(email(`Mira\n![Foto](${own})`)).errors?.[0]).toContain("párrafo 1");
  });

  it("warns when an email is mostly image", () => {
    const warnings = standaloneWarnings(email(`Hola\n\n![Foto](${own})`));
    expect(warnings.some((w) => w.includes("pura imagen"))).toBe(true);
    const texty = standaloneWarnings(email(`${"Texto largo. ".repeat(40)}\n\n![Foto](${own})`));
    expect(texty.some((w) => w.includes("pura imagen"))).toBe(false);
  });

  it("builds the markdown line with safe alt text", () => {
    expect(imageMarkdown(own, "Foto [1]\nfin")).toBe(`![Foto  1  fin](${own})`);
  });
});

describe("processImage", () => {
  let big: Buffer;
  beforeAll(async () => {
    big = await solid(3000, 2000).withExif({ IFD0: { Copyright: "secret" } }).jpeg().toBuffer();
  });
  afterAll(() => undefined);

  it("shrinks to 1200px JPEG and strips metadata", async () => {
    const out = await processImage(big);
    expect(out).toMatchObject({ contentType: "image/jpeg", ext: "jpg", width: 1200, height: 800 });
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("keeps transparency as PNG and never enlarges", async () => {
    const out = await processImage(await solid(300, 100, true).png().toBuffer());
    expect(out).toMatchObject({ contentType: "image/png", width: 300, height: 100 });
  });

  it("converts WebP to JPEG", async () => {
    const out = await processImage(await solid(800, 400).webp().toBuffer());
    expect(out.contentType).toBe("image/jpeg");
  });

  it("rejects SVG, non-images, and empty files", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(processImage(svg)).rejects.toMatchObject({ code: "unsupported" });
    await expect(processImage(Buffer.from("hola"))).rejects.toMatchObject({ code: "unsupported" });
    await expect(processImage(Buffer.alloc(0))).rejects.toMatchObject({ code: "empty" });
  });
});
