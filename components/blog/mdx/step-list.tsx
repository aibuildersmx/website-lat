import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StepListVariant = 'default' | 'success'
export type StepListCounter = 'number' | 'check'
export type StepListItem = string | { label?: string; text: ReactNode }

/**
 * Numbered (or check-prefixed) step cards. Binary black/white.
 *
 * Use for 3–7-item walk-throughs such as "how to install" or "how to set up".
 * Variants:
 *  - `default` — subtle border / neutral counter. The go-to.
 *  - `success` — a slightly stronger neutral card. Use to mark the
 *    "recommended" path in a "pick one" context. (No color — the emphasis is
 *    weight, not hue.)
 *
 * Prefer plain markdown ordered lists (`1. …`) for simple sequences; reach
 * for this component when you want visually separated cards per step.
 *
 * Example:
 * ```mdx
 * <StepList steps={[
 *   'Open your browser.',
 *   'Navigate to example.com.',
 *   'Click sign in.',
 * ]} />
 * ```
 */
export function StepList({
    steps,
    variant = 'default',
    counter = 'number',
}: {
    steps: StepListItem[]
    variant?: StepListVariant
    counter?: StepListCounter
}) {
    const cardClass =
        variant === 'success'
            ? 'border-black/15 bg-black/[0.03]'
            : 'border-black/5 bg-black/[0.02]'

    return (
        <div className="my-6 space-y-3">
            {steps.map((step, i) => {
                const text = typeof step === 'string' ? step : step.text
                const explicitLabel = typeof step !== 'string' ? step.label : undefined
                const defaultLabel = counter === 'check' ? '✓' : String(i + 1)
                const label = explicitLabel ?? defaultLabel
                return (
                    <div key={i} className={cn('flex items-start gap-3 rounded-xl border p-4', cardClass)}>
                        <span className="font-mono text-xs shrink-0 mt-1 text-black/40">{label}</span>
                        <div className="text-base flex-1 min-w-0 text-black/70">{text}</div>
                    </div>
                )
            })}
        </div>
    )
}
