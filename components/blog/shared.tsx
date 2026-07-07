'use client'

import { AlertTriangle, Info, Zap, Shield, List } from 'lucide-react'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ── Callout ──
   Binary black/white. Callout types are differentiated by a mono label and a
   monochrome icon — never by color. (The design system reserves color for
   green/red status dots only.) */
const CALLOUT_CONFIG = {
    info:     { label: 'Nota',       icon: Info },
    warning:  { label: 'Ojo',        icon: AlertTriangle },
    tip:      { label: 'Tip',        icon: Zap },
    security: { label: 'Seguridad',  icon: Shield },
} as const

export function Callout({
    type = 'info',
    children,
}: {
    type?: keyof typeof CALLOUT_CONFIG
    children: ReactNode
}) {
    const { label, icon: Icon } = CALLOUT_CONFIG[type]

    return (
        <div className="my-6 rounded-xl border border-black/10 bg-black/[0.02] p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-black/60" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-black/40">
                    {label}
                </span>
            </div>
            <div className="callout-body text-base leading-relaxed text-black/70 [&>p]:mb-2 [&>p:last-child]:mb-0 [&>p>code]:text-[0.875em] [&>p>code]:px-1.5 [&>p>code]:py-0.5 [&>p>code]:rounded [&>p>code]:font-mono [&>p>code]:bg-black/5 [&>p>code]:text-black [&_strong]:text-black [&_strong]:font-semibold">
                {children}
            </div>
        </div>
    )
}

/* ── Section Title (h2 with id for TOC) ── */
export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
    return (
        <h2
            id={id}
            className="text-2xl sm:text-3xl md:text-4xl font-instrument font-medium text-black mt-16 sm:mt-20 mb-6 scroll-mt-28 text-balance"
        >
            {children}
        </h2>
    )
}

/* ── SubSection (h3) ── */
export function SubSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mt-10 mb-8">
            <h3 className="font-instrument text-xl sm:text-2xl font-medium text-black mb-4">
                {title}
            </h3>
            {children}
        </div>
    )
}

/* ── Prose wrapper ──
   Reading-size (~18px) black/white text block for free-form MDX content that
   isn't routed through the post-content stylesheet. */
export function Prose({ children }: { children: ReactNode }) {
    return (
        <div className="text-lg leading-relaxed text-black/70 space-y-4 [&>p>code]:text-[0.875em] [&>p>code]:px-1.5 [&>p>code]:py-0.5 [&>p>code]:rounded [&>p>code]:font-mono [&>p>code]:bg-black/5 [&>p>code]:text-black [&>p>a]:underline [&>p>a]:underline-offset-4 [&>p>a]:text-black [&_strong]:text-black [&_strong]:font-semibold">
            {children}
        </div>
    )
}

/* ── Sticky TOC ──
   A single black indicator glides along the left rail to the active item
   (animated, not a jump); the active label fades to black slowly. */
export function StickyTOC({ items }: { items: [string, string][] }) {
    const [activeId, setActiveId] = useState('')
    const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
    const indicatorRef = useRef<HTMLSpanElement>(null)
    // While a click-initiated smooth scroll is in flight we lock the observer
    // so the sections passing through the active band don't steal the
    // selection from the item the user actually clicked.
    const scrollLockRef = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (scrollLockRef.current) return
                const visible = entries.filter(e => e.isIntersecting)
                if (visible.length > 0) setActiveId(visible[0].target.id)
            },
            { rootMargin: '-20% 0px -70% 0px' }
        )

        items.forEach(([id]) => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [items])

    // Glide the rail indicator to the vertical center of the active item.
    // Written imperatively (DOM style, not setState) so the measured layout
    // value never round-trips through React state.
    useEffect(() => {
        const indicatorEl = indicatorRef.current
        if (!indicatorEl) return
        const el = activeId ? itemRefs.current[activeId] : null
        if (!el) {
            indicatorEl.style.opacity = '0'
            return
        }
        const INDICATOR_H = 16
        indicatorEl.style.top = `${el.offsetTop + el.clientHeight / 2 - INDICATOR_H / 2}px`
        indicatorEl.style.opacity = '1'
    }, [activeId, items])

    return (
        <nav className="hidden xl:block sticky top-28 self-start w-64 shrink-0">
            {/* The card's own left border doubles as the TOC rail; the black
                indicator glides along it so it reads as the border itself. */}
            <div className="relative rounded-xl border border-black/10 bg-black/[0.02]">
                <span
                    ref={indicatorRef}
                    aria-hidden
                    className="absolute left-0 h-4 w-0.5 -translate-x-1/2 rounded-full bg-black opacity-0 transition-[top,opacity] duration-300 ease-out motion-reduce:transition-none"
                    style={{ top: 0 }}
                />
                <div className="p-5">
                    <p className="font-mono text-[10px] mb-4 flex items-center gap-2 uppercase tracking-widest text-black/40">
                        <List className="size-3.5" />
                        Contenido
                    </p>
                    <ol className="space-y-1 font-sans">
                        {items.map(([id, label]) => (
                            <li key={id} ref={(el) => { itemRefs.current[id] = el }}>
                                <a
                                    href={`#${id}`}
                                    onClick={(e) => {
                                        const target = document.getElementById(id)
                                        if (!target) return
                                        e.preventDefault()
                                        // Lock the observer, select the clicked item, then scroll.
                                        scrollLockRef.current = true
                                        setActiveId(id)
                                        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                                        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
                                        history.replaceState(null, '', `#${id}`)
                                        // Release the lock once the scroll settles (scrollend
                                        // where supported, otherwise a safe timeout fallback).
                                        const release = () => { scrollLockRef.current = false }
                                        const supportsScrollEnd = 'onscrollend' in window
                                        if (supportsScrollEnd) {
                                            window.addEventListener('scrollend', release, { once: true })
                                        } else {
                                            window.setTimeout(release, 800)
                                        }
                                    }}
                                    className={cn(
                                        'block py-1 text-[13px] leading-snug transition-colors duration-500 motion-reduce:transition-none',
                                        activeId === id
                                            ? 'text-black font-medium'
                                            : 'text-black/40 hover:text-black/70',
                                    )}
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

        </nav>
    )
}

/* ── Mobile TOC ── */
export function MobileTOC({ items }: { items: [string, string][] }) {
    return (
        <nav className="xl:hidden rounded-xl border border-black/10 bg-black/[0.02] p-5 sm:p-6 mb-12">
            <p className="font-mono text-[10px] mb-4 flex items-center gap-2 uppercase tracking-widest text-black/40">
                <List className="size-3.5" />
                Contenido
            </p>
            <ol className="space-y-2 text-sm">
                {items.map(([id, label]) => (
                    <li key={id}>
                        <a href={`#${id}`} className="transition-colors text-black/50 hover:text-black">
                            {label}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    )
}
