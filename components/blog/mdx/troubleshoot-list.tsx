import type { ReactNode } from 'react'

export type TroubleshootItem = {
    error: ReactNode
    fix: ReactNode
}

/**
 * Error → fix pair stack. Top line is the error message/code in mono; second
 * line is the human-readable resolution. Binary black/white.
 *
 * Use for "troubleshooting" / "common errors" sections. For a single
 * error-vs-fix pair, prefer <Callout type="warning">.
 *
 * Example:
 * ```mdx
 * <TroubleshootList items={[
 *   { error: 'Access blocked', fix: 'Add your account as a test user.' },
 *   { error: 'accessNotConfigured', fix: 'Enable the API in Cloud Console.' },
 * ]} />
 * ```
 */
export function TroubleshootList({ items }: { items: TroubleshootItem[] }) {
    return (
        <div className="my-6 space-y-3">
            {items.map((item, i) => (
                <div key={i} className="rounded-xl border border-black/10 bg-black/[0.02] p-4">
                    <p className="text-xs font-mono mb-1 font-medium text-black">{item.error}</p>
                    <p className="text-base text-black/70">{item.fix}</p>
                </div>
            ))}
        </div>
    )
}
