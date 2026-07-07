import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

export type CheckListItem =
    | string
    | ReactNode
    | { title?: ReactNode; description?: ReactNode }

/**
 * Blog checklist — a single card of checked rows, divided by hairlines.
 * Binary black/white: the check sits in a small white circle, the title is
 * bold black, the body is `black/70`. Reads at the post body size (~18px).
 *
 * Items accept three shapes:
 *  - a plain string,
 *  - `{ title, description }` (renders "**title** — description"),
 *  - any ReactNode (rendered as-is).
 *
 * Example:
 * ```mdx
 * <CheckList items={[
 *   { title: 'Memoria', description: 'Que recuerde qué ya hizo.' },
 *   { title: 'Herramientas', description: 'Acceso a tus cosas.' },
 * ]} />
 * ```
 */
export function CheckList({ items }: { items: CheckListItem[] }) {
    return (
        <div className="my-6 overflow-hidden rounded-xl border border-black/10 bg-black/[0.02] divide-y divide-black/[0.06]">
            {items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 sm:p-5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white">
                        <Check className="size-3 text-black" strokeWidth={3} />
                    </span>
                    <div className="text-base leading-relaxed text-black/70">
                        {renderItem(item)}
                    </div>
                </div>
            ))}
        </div>
    )
}

function renderItem(item: CheckListItem): ReactNode {
    if (item === null || item === undefined) return null
    if (typeof item === 'string') return item
    if (
        typeof item === 'object' &&
        !Array.isArray(item) &&
        ('title' in item || 'description' in item) &&
        !('$$typeof' in (item as object))
    ) {
        const { title, description } = item as { title?: ReactNode; description?: ReactNode }
        return (
            <>
                {title ? <strong className="font-semibold text-black">{title}</strong> : null}
                {title && description ? ' — ' : null}
                {description}
            </>
        )
    }
    return item as ReactNode
}
