import type { ReactNode } from 'react'
import { Shield } from 'lucide-react'

export type SecurityListItem = {
    title: string
    description: ReactNode
}

/**
 * Shield-icon card stack for security/hardening checklists. Binary B/W —
 * the shield icon + title carry the "security" meaning, not color.
 *
 * Use for "rules of thumb" blocks where each rule gets a short headline and
 * a one-paragraph rationale. For a single-paragraph warning, prefer
 * <Callout type="security">.
 *
 * Example:
 * ```mdx
 * <SecurityList items={[
 *   { title: 'Nunca en tu laptop', description: 'Corre el agente en un VPS.' },
 *   { title: 'Cuenta dedicada', description: 'No uses tus credenciales personales.' },
 * ]} />
 * ```
 */
export function SecurityList({ items }: { items: SecurityListItem[] }) {
    return (
        <div className="my-6 space-y-4">
            {items.map((item) => (
                <div key={item.title} className="rounded-xl border border-black/10 bg-black/[0.02] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 shrink-0 mt-1 text-black/60" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium mb-1 text-black">{item.title}</p>
                            <p className="text-base text-black/70">{item.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
