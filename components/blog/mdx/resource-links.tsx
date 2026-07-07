import { ExternalLink } from 'lucide-react'

export type ResourceLink = {
    label: string
    url: string
    desc: string
}

/**
 * Vertical list of external-link cards. Typical use: the "Recursos" section
 * at the bottom of a post. Internal links (starting with `/`) are rendered
 * without `target="_blank"`. Binary black/white.
 *
 * Example:
 * ```mdx
 * <ResourceLinks items={[
 *   { label: 'Docs', url: 'https://example.com/docs', desc: 'Official reference' },
 *   { label: 'Guía', url: '/blog/otra-guia', desc: 'Post relacionado' },
 * ]} />
 * ```
 */
export function ResourceLinks({ items }: { items: ResourceLink[] }) {
    return (
        <div className="my-6 space-y-3">
            {items.map((link) => {
                const isExternal = !link.url.startsWith('/')
                return (
                    <a
                        key={link.url}
                        href={link.url}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="no-underline flex items-center justify-between rounded-xl border border-black/10 bg-black/[0.02] p-4 transition-all group hover:bg-black/[0.04] hover:border-black/20"
                    >
                        <div>
                            <p className="text-sm font-medium text-black">{link.label}</p>
                            <p className="text-xs mt-0.5 text-black/40">{link.desc}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 shrink-0 text-black/40" />
                    </a>
                )
            })}
        </div>
    )
}
