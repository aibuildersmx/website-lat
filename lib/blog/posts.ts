import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

/**
 * Server-only data layer that reads blog posts from `content/blog/*.mdx`.
 *
 * Do NOT import this from a client component — it uses `node:fs` and will
 * break the browser bundle. Import it only from `app/` server components,
 * server actions, or other server-side modules.
 *
 * Frontmatter schema is documented in [docs/blog/frontmatter.md](/docs/blog/frontmatter.md)
 * and the on-disk shape is illustrated by [docs/blog/_template.mdx](/docs/blog/_template.mdx).
 */

export type BlogTocItem = [id: string, label: string]

/**
 * Attribution pointing the reader to the original publication this post was
 * derived from (e.g. a tweet, thread, or external article). Rendered as a
 * small pill in the article header by [PostShell](/components/blog/post-shell.tsx).
 */
export type BlogPostSource = {
    /** External URL the post is derived from. */
    url: string
    /** Display label, e.g. "Directamente extraído de X". */
    label: string
}

/**
 * Credit for the cover image. Rendered as a small caption directly under the
 * cover in [PostShell](/components/blog/post-shell.tsx) so the attribution
 * lives next to the photo instead of at the bottom of the article.
 */
export type BlogPostCredit = {
    /** Display label, e.g. "Eugene Golovesov / Unsplash". */
    label: string
    /** Optional URL the label links to (the photo / author page). */
    url?: string
}

export type BlogPostMeta = {
    slug: string
    title: string
    description: string
    /** ISO 8601 date, e.g. "2026-02-20" */
    date: string
    /** Display-ready, e.g. "10 min" */
    readTime: string
    tags?: string[]
    /** Cover image path in /public, e.g. "/images/blog/foo/cover.png" */
    cover?: string
    /** Optional credit for the cover image, shown as a small caption under it */
    coverCredit?: BlogPostCredit
    author?: string
    /** Optional attribution to the original source (tweet, article, etc.) */
    source?: BlogPostSource
    /** When true the post is excluded from `getAllPosts()` and the index */
    draft?: boolean
    /** Table of contents pairs `[id, label]` in display order */
    tocItems: BlogTocItem[]
}

export type BlogPost = {
    meta: BlogPostMeta
    /** Raw MDX body (frontmatter stripped) */
    content: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')
const POST_EXT = '.mdx'

function safeReaddir(dir: string): string[] {
    try {
        return fs.readdirSync(dir)
    } catch {
        return []
    }
}

function toSource(raw: unknown): BlogPostSource | undefined {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    const r = raw as { url?: unknown; label?: unknown }
    if (typeof r.url !== 'string' || r.url.length === 0) return undefined
    const label = typeof r.label === 'string' && r.label.length > 0 ? r.label : 'Fuente original'
    return { url: r.url, label }
}

function toCredit(raw: unknown): BlogPostCredit | undefined {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    const r = raw as { label?: unknown; url?: unknown }
    if (typeof r.label !== 'string' || r.label.length === 0) return undefined
    return {
        label: r.label,
        url: typeof r.url === 'string' && r.url.length > 0 ? r.url : undefined,
    }
}

function toTocItems(raw: unknown): BlogTocItem[] {
    if (!Array.isArray(raw)) return []
    const items: BlogTocItem[] = []
    for (const entry of raw) {
        // Accept `[id, label]` tuples — flow YAML style.
        if (
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === 'string' &&
            typeof entry[1] === 'string'
        ) {
            items.push([entry[0], entry[1]])
            continue
        }
        // Accept `{ id, label }` objects — block YAML style, easier for non-devs.
        if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
            const e = entry as { id?: unknown; label?: unknown }
            if (typeof e.id === 'string' && typeof e.label === 'string') {
                items.push([e.id, e.label])
            }
        }
    }
    return items
}

function parsePost(slug: string): BlogPost | null {
    const file = path.join(CONTENT_DIR, `${slug}${POST_EXT}`)
    if (!fs.existsSync(file)) return null

    const raw = fs.readFileSync(file, 'utf8')
    const { data, content } = matter(raw)

    const meta: BlogPostMeta = {
        slug,
        title: typeof data.title === 'string' ? data.title : '',
        description: typeof data.description === 'string' ? data.description : '',
        date: typeof data.date === 'string' ? data.date : String(data.date ?? ''),
        readTime: typeof data.readTime === 'string' ? data.readTime : '',
        tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
        cover: typeof data.cover === 'string' ? data.cover : undefined,
        coverCredit: toCredit(data.coverCredit),
        author: typeof data.author === 'string' ? data.author : undefined,
        source: toSource(data.source),
        draft: data.draft === true ? true : undefined,
        tocItems: toTocItems(data.tocItems),
    }
    return { meta, content }
}

/**
 * Returns every usable slug found under `content/blog/`.
 * Ignores files that start with `_` (treated as templates/drafts).
 */
export function getAllPostSlugs(): string[] {
    return safeReaddir(CONTENT_DIR)
        .filter((file) => file.endsWith(POST_EXT) && !file.startsWith('_'))
        .map((file) => file.slice(0, -POST_EXT.length))
}

/** Returns the fully parsed post for a slug, or `null` when not found. */
export function getPostBySlug(slug: string): BlogPost | null {
    return parsePost(slug)
}

/**
 * Returns every non-draft post's metadata, sorted newest first by ISO `date`.
 * Use for the blog index, OG graphs, RSS feeds, etc.
 */
export function getAllPosts(): BlogPostMeta[] {
    return getAllPostSlugs()
        .map(parsePost)
        .filter((post): post is BlogPost => post !== null && post.meta.draft !== true)
        .map((post) => post.meta)
        .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Formats an ISO date string into a stable display form (e.g. "20 Feb 2026").
 * Separate helper so the same transform powers both the index cards and
 * the post header in [PostShell](/components/blog/post-shell.tsx).
 */
export function formatPostDate(iso: string, locale = 'en-GB'): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(d)
}
