# Blog — MDX Component Reference

> The complete set of JSX components you can use inside a `content/blog/*.mdx` file, plus the rendering rules for plain markdown.

All components are pre-registered in [`mdx-components.tsx`](../../mdx-components.tsx). You **don't need to import anything** inside an MDX file — just use the tags directly.

Every component is theme-aware via the blog-scoped light/dark toggle (see [`app/(blog)/layout.tsx`](../../app/(blog)/layout.tsx)), so you never need `dark:` Tailwind classes inside an MDX file.

---

## Rule of thumb

| Use… | When… |
|------|-------|
| Plain markdown | The default. Paragraphs, headings, lists, links, inline `code`, GFM tables — always try this first. |
| A component below | The pattern repeats in multiple posts **and** is documented here. |
| Nothing | Your idea doesn't match anything below. Ask in the PR before inventing a new pattern. |

---

## Plain markdown (no JSX required)

The article body is wrapped by `.post-content` in [`components/blog/post-shell.tsx`](../../components/blog/post-shell.tsx), which auto-styles standard markdown to match the design system:

- **Paragraphs** — Catppuccin subtext color in dark mode, `text-black/70` in light.
- **Headings** (`##`, `###`) — Instrument Serif display. Use `<SectionTitle id="…">` instead when the heading must appear in the TOC.
- **Links** — Underlined with a themed accent color. Components that shouldn't show link underlines (cards, buttons) opt out with `className="…no-underline"`.
- **Inline `code`** — Themed monospaced chip.
- **Code fences** — Triple-backtick blocks (```` ```ts ````) auto-render as `<CodeBlock>` with a copy button. See `pre` handling in [`mdx-components.tsx`](../../mdx-components.tsx).
- **Images** — `![alt](/path)` renders through a `next/image`-backed `img` handler. For screenshots that deserve a figure treatment (border + optional caption), use `<PostImage>` instead.
- **Lists & GFM tables** — Enabled via `remark-gfm`. Use for simple enumeration. Reach for a JSX list component only when you want visual prominence.

---

## Component index

### Structure

- [`<SectionTitle>`](#sectiontitle) — H2 with `id` for TOC anchor
- [`<SubSection>`](#subsection) — H3 inside a section

### Emphasis

- [`<Callout>`](#callout) — info / tip / warning / security block
- [`<EmphasisBox>`](#emphasisbox) — italic insight box

### Lists

- [`<CheckList>`](#checklist) — green-checkmark bullet list
- [`<StepList>`](#steplist) — numbered or check-prefixed step cards
- [`<ResourceLinks>`](#resourcelinks) — external-link card list
- [`<SecurityList>`](#securitylist) — red-tinted shield card list
- [`<TroubleshootList>`](#troubleshootlist) — error → fix pair list
- [`<CommandReference>`](#commandreference) — CLI cheatsheet groups

### Code

- `<CodeBlock>` — themed code block (auto-rendered by triple-backtick fences, rarely used directly)
- `<Terminal>` — animated terminal with traffic lights

### Media

- [`<PostImage>`](#postimage) — figure with optional caption
- [`<DownloadButton>`](#downloadbutton) — centered download CTA

---

## Structure

### `<SectionTitle>`

An H2 with a scroll-anchor `id`. **Use this instead of `##`** whenever the heading needs to appear in the TOC.

**Props**

| Prop | Type | Notes |
|------|------|-------|
| `id` | string | Must match an entry in the frontmatter `tocItems`. Kebab-case. |
| `children` | ReactNode | The visible heading text. |

**Example**

```mdx
<SectionTitle id="que-es">¿Qué es un Segundo Cerebro?</SectionTitle>
```

### `<SubSection>`

An H3 + optional body wrapper. Use for the second-level headings inside a section. Does **not** get a TOC entry (by design — keep the TOC to one level).

**Props**

| Prop | Type |
|------|------|
| `title` | string |
| `children` | ReactNode |

**Example**

```mdx
<SubSection title="Variante recomendada">
  La cuenta dedicada mantiene tus credenciales aisladas.
</SubSection>
```

---

## Emphasis

### `<Callout>`

A bordered, icon-prefixed block for a single-paragraph call-out. The four `type` values map to semantic colors from the Catppuccin palette.

**Props**

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `type` | `'info' \| 'tip' \| 'warning' \| 'security'` | `'info'` | Selects icon + color. |
| `children` | ReactNode | — | Markdown allowed inside (`**bold**`, `` `code` ``, links). |

**Example**

```mdx
<Callout type="warning">
  Siempre corre el agente en un VPS, **nunca en tu laptop** — un prompt hostil
  puede leer archivos del sistema.
</Callout>
```

**When not to use it**

- Need multiple rules at once? Use `<SecurityList>` (for security) or `<TroubleshootList>` (for error/fix pairs).
- Just want to italicize one insight without an icon? Use `<EmphasisBox>`.

### `<EmphasisBox>`

Quieter cousin of `<Callout>` — an italic insight block with no icon. Reach for it when a callout feels heavy but you still want the reader to slow down on a single sentence.

**Props**

| Prop | Type | Default |
|------|------|---------|
| `variant` | `'info' \| 'warning'` | `'warning'` |
| `children` | ReactNode | — |

**Example**

```mdx
<EmphasisBox variant="warning">
  Para acceder a Google Calendar por API siempre necesitas pasar por OAuth.
</EmphasisBox>
```

---

## Lists

### `<CheckList>`

Green-checkmark bullet list inside a subtle card. Use for "what's included" / "benefits" / "features" — any list where the ✓ reinforces a positive signal.

**Props**

| Prop | Type |
|------|------|
| `items` | `Array<string \| ReactNode \| { title?: ReactNode; description?: ReactNode }>` |

**Examples**

```mdx
{/* simple strings */}
<CheckList items={[
  "Búsqueda web integrada",
  "Markdown nativo",
  "Sin extensiones extra",
]} />

{/* title + description pairs */}
<CheckList items={[
  { title: "Búsqueda web con IA", description: "Para investigar automáticamente" },
  { title: "Markdown nativo", description: "Estructura sin complejidad" },
]} />
```

**Don't use it for**: plain bullet points with no positive signal → use markdown `-` lists instead.

### `<StepList>`

Numbered (or ✓-prefixed) step cards for short walkthroughs.

**Props**

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `steps` | `Array<string \| { label?: string; text: ReactNode }>` | — | `label` overrides the auto-number. |
| `variant` | `'default' \| 'success'` | `'default'` | `success` paints the cards green — use for the "recommended" option in a pick-one context. |
| `counter` | `'number' \| 'check'` | `'number'` | Switch to `check` for completed / ✓ lists. |

**Examples**

```mdx
<StepList steps={[
  "Abre tu navegador.",
  "Navega a example.com.",
  "Haz click en Sign In.",
]} />

<StepList
  variant="success"
  counter="check"
  steps={[
    { label: "✓", text: "Credenciales aisladas" },
    { label: "✓", text: "Calendario compartido con tu cuenta real" },
  ]}
/>
```

**Don't use it for**: 1–2 sequential actions (just write prose) or 10+ steps (break into multiple sections with `<SectionTitle>`s).

### `<ResourceLinks>`

Vertical stack of external-link cards. Canonical use: the "Recursos" section at the bottom of a post. Internal links (starting with `/`) render without `target="_blank"`.

**Props**

| Prop | Type |
|------|------|
| `items` | `Array<{ label: string; url: string; desc: string }>` |

**Example**

```mdx
<ResourceLinks items={[
  { label: "Docs oficiales", url: "https://example.com/docs", desc: "Referencia de API" },
  { label: "Guía relacionada", url: "/blog/otra-guia", desc: "Post interno" },
]} />
```

### `<SecurityList>`

Red-tinted, shield-icon card stack for security / hardening rules. Each item is a titled card with a paragraph of rationale.

**Props**

| Prop | Type |
|------|------|
| `items` | `Array<{ title: string; description: ReactNode }>` |

**Example**

```mdx
<SecurityList items={[
  { title: "Nunca en tu laptop", description: "Corre el agente en un VPS aislado." },
  { title: "Cuenta dedicada", description: "No uses tus credenciales personales para automatización." },
]} />
```

**Don't use it for**: single warnings → `<Callout type="security">`. Non-security rules → `<StepList>` or plain markdown.

### `<TroubleshootList>`

Stack of error → fix pairs. Top line is mono red (the error message), bottom line is the human-readable fix. Canonical use: "Errores comunes" / "Troubleshooting" sections.

**Props**

| Prop | Type |
|------|------|
| `items` | `Array<{ error: ReactNode; fix: ReactNode }>` |

**Example**

```mdx
<TroubleshootList items={[
  { error: "Access blocked", fix: "Agrega tu cuenta como test user en Cloud Console." },
  { error: "accessNotConfigured", fix: "Habilita la API en Cloud Console → APIs & Services." },
]} />
```

### `<CommandReference>`

Grouped CLI cheatsheet. Each group has a category label, optional icon, and a list of `{ cmd, desc }` rows.

**Props**

| Prop | Type |
|------|------|
| `groups` | `Array<CommandReferenceGroup>` |

Where `CommandReferenceGroup` is:

```ts
{
  category: string
  icon?: 'bot' | 'brain' | 'gauge' | 'globe' | 'info' | 'key' | 'lock'
       | 'message' | 'settings' | 'shield' | 'stethoscope' | 'terminal' | 'zap'
  commands: Array<{ cmd: string; desc: ReactNode }>
}
```

**Critical gotcha — icons are strings, not components.** MDX files are server components; passing a Lucide icon as a function reference crosses the server/client boundary and errors at build. Pass the name:

```mdx
{/* ✅ correct */}
<CommandReference groups={[
  {
    category: "Diagnóstico",
    icon: "stethoscope",
    commands: [
      { cmd: "openclaw doctor", desc: "Checa todo y ofrece fixes automáticos" },
      { cmd: "openclaw status --all", desc: "Diagnóstico completo" },
    ],
  },
]} />

{/* ❌ will fail to build:
    Error: Functions cannot be passed directly to Client Components */}
<CommandReference groups={[
  { category: "Diagnóstico", icon: Stethoscope, commands: [...] }
]} />
```

Need an icon that isn't in the allowed set? Add it to the `CommandReferenceIcon` union **and** `ICON_MAP` in [`components/blog/mdx/command-reference.tsx`](../../components/blog/mdx/command-reference.tsx) in the same PR.

---

## Code

### Code fences (auto-rendered)

Triple-backtick blocks render through `<CodeBlock>` automatically. The language tag drives the label in the header:

````mdx
```bash
pnpm install
pnpm dev
```
````

You almost never need to use `<CodeBlock>` directly. The only reason to do so is if you're generating the code string programmatically inside MDX expressions — which you probably shouldn't be.

### `<Terminal>`

Animated terminal window with traffic-light chrome. Use sparingly — it's a high-attention component designed for hero-ish moments (e.g. "here's what installing looks like"), not routine command output.

See [`components/blog/terminal.tsx`](../../components/blog/terminal.tsx) for the full props. For most posts, a plain ```` ```bash ```` fence is the right choice.

---

## Media

### `<PostImage>`

Themed screenshot / figure wrapper around `next/image`. Use this instead of markdown `![alt](/path)` when the image deserves a figure treatment — rounded border, proper light/dark borders, optional caption.

**Props**

| Prop | Type | Required | Notes |
|------|------|:--------:|-------|
| `src` | string | ✅ | Path inside `/public`, e.g. `/images/blog/mi-post/foo.png`. |
| `alt` | string | ✅ | Required for accessibility + SEO. Don't skip. |
| `width` | number | ✅ | Intrinsic pixel width (next/image layout stability). Image still scales to article width. |
| `height` | number | ✅ | Intrinsic pixel height. |
| `caption` | string | — | Optional italic caption below the image. |

**Example**

```mdx
<PostImage
  src="/images/blog/mi-post/screenshot.png"
  alt="Estructura de proyecto en Cursor"
  width={800}
  height={500}
  caption="Figura 1: proyecto inicial después de correr el comando."
/>
```

Store all images for a post under `public/images/blog/<slug>/` so assets stay co-located with the content.

### `<DownloadButton>`

Centered download CTA — a single rounded button with a download icon. Use for "aquí está la plantilla" moments at the end of a post.

**Props**

| Prop | Type | Notes |
|------|------|-------|
| `href` | string | Path to a static asset in `/public`, or an external URL. |
| `children` | ReactNode | Button label. |

**Example**

```mdx
<DownloadButton href="/assets/second-brain.zip">
  Descarga la plantilla
</DownloadButton>
```

**Don't use it for**: arbitrary internal links (use a plain markdown link) or dense CTAs (use `<ResourceLinks>`).

---

## Adding a new component

If you truly need a pattern that doesn't exist yet:

1. Create the component at `components/blog/mdx/<name>.tsx`.
2. Mark it `'use client'` if it needs `useBlogTheme()` (almost always yes).
3. Register it in [`mdx-components.tsx`](../../mdx-components.tsx).
4. Add a section to this doc with props table + example.
5. Do **not** pass function components or other non-serializable props from an MDX file — use string keys mapped internally, the way `<CommandReference>` handles icons.

Open a PR with all of those in a single commit so the component and its docs stay in lockstep.
