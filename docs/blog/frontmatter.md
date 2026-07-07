# Blog — Frontmatter Reference

> Every field you can (or must) put at the top of a `content/blog/*.mdx` file.

Frontmatter is the YAML block wrapped in `---` at the very top of an MDX file. It's parsed by [`gray-matter`](https://www.npmjs.com/package/gray-matter) inside [`lib/blog/posts.ts`](../../lib/blog/posts.ts) and stripped from the MDX body by the [`remark-frontmatter`](https://www.npmjs.com/package/remark-frontmatter) plugin configured in [`next.config.ts`](../../next.config.ts).

The canonical TypeScript shape is [`BlogPostMeta`](../../lib/blog/posts.ts) — whatever this doc says, the type definition wins.

---

## Quick reference

| Field       | Required | Type                       | Notes |
|-------------|:--------:|----------------------------|-------|
| `title`     | ✅       | string                     | Appears in `<h1>`, `<title>`, OG card. Keep under ~70 chars. |
| `description` | ✅     | string                     | Meta description + index card subtitle. 1–2 sentences. |
| `date`      | ✅       | ISO 8601 string (`YYYY-MM-DD`) | Drives sort order and header display. |
| `readTime`  | ✅       | string                     | Display-ready, e.g. `"10 min"`. Not calculated. |
| `tocItems`  | ✅       | array of `{ id, label }` (or `[id, label]` tuples) | One entry per `<SectionTitle id="…">` in the post. Ordered top to bottom. |
| `tags`      | optional | string[]                   | Free-form. Shown on the index card as mono chips. |
| `cover`     | optional | string (path in `/public`) | Hero image for OG card and index thumbnail. |
| `coverCredit` | optional | `{ label, url? }`         | Small photo credit shown under the cover image. |
| `author`    | optional | string                     | Defaults to the AIBM collective byline when omitted. |
| `source`    | optional | `{ url, label }`           | Attribution pill in the article header pointing to the original publication (e.g. a tweet). |
| `draft`     | optional | `true` (omit otherwise)    | When `true`, the post is excluded from the index and sitemap but still routable. |

Field order inside the YAML doesn't affect rendering, but the table order above is the convention we follow across existing posts — keep it consistent.

---

## Minimum viable frontmatter

This is the smallest block that builds cleanly:

```yaml
---
title: "Mi primer post"
description: "Una descripción de una o dos frases que resume el post."
date: "2026-04-23"
readTime: "5 min"
tocItems:
  - { id: "intro", label: "Introducción" }
---
```

Corresponds to a post body that must contain at least `<SectionTitle id="intro">Introducción</SectionTitle>`.

---

## Full example

Here's a frontmatter block that uses every documented field:

```yaml
---
title: "Cursor: Tu Segundo Cerebro"
description: "Convierte un editor de código con IA en el sistema de organización y pensamiento más poderoso que hayas tenido."
date: "2026-02-20"
readTime: "10 min"
author: "Ricardo Garcia"
cover: "/images/blog/second-brain/cover.png"
tags:
  - cursor
  - productividad
  - segundo-cerebro
tocItems:
  - { id: "que-es", label: "¿Qué es un Segundo Cerebro?" }
  - { id: "por-que-cursor", label: "¿Por qué Cursor?" }
  - { id: "paso-1", label: "Paso 1: Estructura Base" }
  - { id: "paso-2", label: "Paso 2: Tu Primer Proyecto" }
  - { id: "conclusion", label: "Conclusión" }
---
```

---

## Field-by-field

### `title` *(required)*

Shown as the H1 at the top of the post and as the title of the OG / Twitter card. Also prefixes the browser tab title via Next's `generateMetadata`. Avoid trailing periods; capitalize like a headline.

### `description` *(required)*

The subtitle under the post header, the card subtitle on `/blog`, and the meta description / OG description. Aim for 1–2 sentences that would make someone click — not a summary, a hook.

### `date` *(required)*

ISO 8601 date in the form `YYYY-MM-DD` (quotes required). Drives:
- Sort order on `/blog` (newest first).
- Display under the title (formatted by [`formatPostDate`](../../lib/blog/posts.ts) as e.g. `20 Feb 2026`).
- The `dateTime` attribute on the `<time>` element (SEO + a11y).

Use the publish date, not the authoring date.

### `readTime` *(required)*

Plain string, shown as-is next to the date. Convention: `"5 min"`, `"10 min"`, `"15+ min"`. We **don't** auto-calculate this — humans give better estimates than word-count heuristics.

### `tocItems` *(required)*

The sticky table of contents on the right rail (desktop) and the collapsible TOC card (mobile) render exclusively from this array. Missing an entry = missing from the TOC.

Two accepted shapes, use whichever reads better in your file:

```yaml
# Object form — easier to scan, preferred for new posts
tocItems:
  - { id: "intro", label: "Introducción" }
  - { id: "paso-1", label: "Paso 1: Configuración" }

# Tuple form — more compact, works too
tocItems:
  - ["intro", "Introducción"]
  - ["paso-1", "Paso 1: Configuración"]
```

Every `id` must match a `<SectionTitle id="...">` in the body. The `label` is what appears in the TOC — it can differ from the section's visible heading when the heading is too long to fit.

### `tags` *(optional)*

Free-form string array, rendered on the blog index card as small mono pills. No tag registry yet — keep them lowercase and short (one or two words each).

```yaml
tags:
  - cursor
  - productividad
  - ai-builders
```

### `cover` *(optional)*

Path to an image in `/public`. Used for:
- The `og:image` and `twitter:image` meta tags.
- The thumbnail on the blog index card.

Recommended: 1600×840 JPG or PNG, under 200 KB. Store it in `public/images/blog/<slug>/cover.{png,jpg}` so assets stay co-located.

```yaml
cover: "/images/blog/mi-post/cover.jpg"
```

### `coverCredit` *(optional)*

Photo credit for the `cover`. Renders as a small mono caption directly under
the cover image (`Foto: <label>`), so the attribution lives next to the photo
instead of at the bottom of the post. Ignored when there is no `cover`.

Keys:

- `label` *(required)* — short credit string, e.g. `"Eugene Golovesov / Unsplash"`.
- `url` *(optional)* — link for the label (the photo or author page).

```yaml
coverCredit:
  label: "Eugene Golovesov / Unsplash"
  url: "https://unsplash.com/photos/zUuJz_idfqM"
```

### `author` *(optional)*

String, shown in the post header next to the date. Omit for the default AIBM byline.

### `source` *(optional)*

Attribution to the original publication the post was derived from — a tweet, a thread, an article, a talk. Renders as a small pill above the header meta row (date · readTime · author) with an external-link arrow, and opens the `url` in a new tab.

Required keys:

- `url` — absolute URL to the original source.
- `label` — short display string (kept in mono uppercase in the pill).

```yaml
source:
  url: "https://x.com/ricgarcas/status/2046980838550577618"
  label: "Extraído de X"
```

Omit the whole block when the post is original to the blog. If `url` is missing the pill is skipped entirely; when only `label` is missing we fall back to `"Fuente original"`.

### `draft` *(optional)*

Set to `true` to keep the post off the index page while you're still working. The file is still parseable and visible at `/blog/<slug>` if you know the URL — useful for sharing a preview link. Remove the line (don't set it to `false`) before publishing.

```yaml
draft: true
```

---

## YAML gotchas

- **Always quote strings containing `:` or `#`** — YAML treats them as structure. `title: "Next.js 16: Cache Components"` works; `title: Next.js 16: Cache Components` does not.
- **Dates must be quoted.** Bare `2026-02-20` is parsed as a JS `Date` by `gray-matter` on some configurations; quoting to `"2026-02-20"` keeps it a string so our code owns the formatting.
- **Nested arrays need consistent indentation.** Two spaces per level. Don't mix tabs and spaces.
- **Don't commit `content/blog/_*.mdx`.** Files starting with `_` are filtered out of `getAllPostSlugs()` as a convention for in-progress drafts. The template lives in `docs/blog/_template.mdx` (outside `content/blog/`) to keep that rule clean.
