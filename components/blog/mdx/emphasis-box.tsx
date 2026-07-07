import type { ReactNode } from 'react'

export type EmphasisBoxVariant = 'info' | 'warning'

/**
 * Italic emphasis box — a single-paragraph quote/insight inside a tinted
 * card. Reach for it when a Callout feels too heavy (no icon, shorter visual
 * weight) but you still want the reader to linger on one sentence.
 *
 * Binary black/white. The `variant` prop is accepted for backward
 * compatibility but both variants render the same neutral card — emphasis
 * comes from the italic + tint, not from color.
 *
 * Example:
 * ```mdx
 * <EmphasisBox>
 *   Para acceder a Google Calendar por API siempre necesitas pasar por OAuth.
 * </EmphasisBox>
 * ```
 */
export function EmphasisBox({
    children,
}: {
    variant?: EmphasisBoxVariant
    children: ReactNode
}) {
    return (
        <div className="my-6 rounded-xl border border-black/10 bg-black/[0.02] p-5 sm:p-6">
            <div className="text-base italic leading-relaxed text-black/70 [&>p]:mb-2 [&>p:last-child]:mb-0">
                {children}
            </div>
        </div>
    )
}
