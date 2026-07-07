import type { ReactNode } from 'react'
import {
    Bot,
    Brain,
    Gauge,
    Globe,
    Info,
    Key,
    Lock,
    MessageSquare,
    Settings,
    Shield,
    Stethoscope,
    Terminal as TerminalIcon,
    Zap,
} from 'lucide-react'

/**
 * Named icons accepted by `<CommandReference>`'s `icon` prop.
 * Contributors pass a string so we don't cross the MDX (server) → client
 * boundary with function references.
 *
 * Add new keys here and wire them into ICON_MAP below if you need an icon
 * not already listed.
 */
export type CommandReferenceIcon =
    | 'bot'
    | 'brain'
    | 'gauge'
    | 'globe'
    | 'info'
    | 'key'
    | 'lock'
    | 'message'
    | 'settings'
    | 'shield'
    | 'stethoscope'
    | 'terminal'
    | 'zap'

const ICON_MAP = {
    bot: Bot,
    brain: Brain,
    gauge: Gauge,
    globe: Globe,
    info: Info,
    key: Key,
    lock: Lock,
    message: MessageSquare,
    settings: Settings,
    shield: Shield,
    stethoscope: Stethoscope,
    terminal: TerminalIcon,
    zap: Zap,
} as const satisfies Record<CommandReferenceIcon, unknown>

export type CommandReferenceCommand = {
    cmd: string
    desc: ReactNode
}

export type CommandReferenceGroup = {
    category: string
    /** Named icon from the allowed set. See `CommandReferenceIcon`. */
    icon?: CommandReferenceIcon
    commands: CommandReferenceCommand[]
}

/**
 * Grouped command reference — a series of "category → rows of {cmd, desc}"
 * blocks. Used for "Comandos útiles" / cheat-sheet sections. Binary B/W.
 *
 * Pass icons by name (e.g. `icon: 'stethoscope'`) rather than importing
 * lucide components yourself — MDX files are server components and icon
 * functions can't cross the server/client boundary.
 *
 * Example:
 * ```mdx
 * <CommandReference groups={[
 *   {
 *     category: 'Diagnóstico',
 *     icon: 'stethoscope',
 *     commands: [
 *       { cmd: 'app doctor', desc: 'Checa todo y ofrece fixes' },
 *       { cmd: 'app status --all', desc: 'Diagnóstico completo' },
 *     ],
 *   },
 * ]} />
 * ```
 */
export function CommandReference({ groups }: { groups: CommandReferenceGroup[] }) {
    return (
        <>
            {groups.map((group) => {
                const Icon = group.icon ? ICON_MAP[group.icon] : null
                return (
                    <div key={group.category} className="my-6">
                        <p className="text-sm font-medium mb-3 flex items-center gap-2 text-black">
                            {Icon ? <Icon className="w-4 h-4 text-black/60" /> : null}
                            {group.category}
                        </p>
                        <div className="space-y-2">
                            {group.commands.map((c) => (
                                <div
                                    key={c.cmd}
                                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3"
                                >
                                    <code className="text-xs font-mono shrink-0 text-black">
                                        {c.cmd}
                                    </code>
                                    <span className="text-sm text-black/60">{c.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </>
    )
}
