/**
 * Author registry for the blog.
 *
 * The `author` field in a post's frontmatter is a plain string that maps
 * into this lookup (e.g. `author: "Ricardo Garcia"`). Keep this in sync
 * with [components/team.tsx](/components/team.tsx) so the public-facing
 * name is identical across the site.
 *
 * When a founder starts writing, add them here with their headshot from
 * `/public` and their preferred link (LinkedIn, personal site, etc.).
 */

export type BlogAuthor = {
    /** Display name (matches the frontmatter string verbatim) */
    name: string
    /** Path under `/public`, e.g. "/ricardo.avif" */
    avatar: string
    /** Optional external link — LinkedIn, personal site, X, etc. */
    href?: string
}

const authors: Record<string, BlogAuthor> = {
    'Ricardo Garcia': {
        name: 'Ricardo Garcia',
        avatar: '/ricardo.avif',
        href: 'https://linkedin.com/in/ricgarcas',
    },
    'Ben Kim': {
        name: 'Ben Kim',
        avatar: '/ben.avif',
        href: 'https://ben-k.im',
    },
    'Javier Rivero': {
        name: 'Javier Rivero',
        avatar: '/javier.avif',
        href: 'https://javierivero.com/',
    },
}

/**
 * Resolve a frontmatter author string into a full profile.
 * Returns `null` for unknown authors so callers can render a safe fallback
 * (or hide the byline entirely).
 */
export function getAuthor(name: string | undefined): BlogAuthor | null {
    if (!name) return null
    return authors[name] ?? null
}
