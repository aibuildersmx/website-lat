import type { ReactNode } from 'react'
import { Download } from 'lucide-react'

/**
 * Centered download call-to-action. A confident black pill (the site's
 * primary action treatment) with a download icon to the left of the label.
 *
 * Example:
 * ```mdx
 * <DownloadButton href="/assets/starter.zip">Descarga la plantilla</DownloadButton>
 * ```
 */
export function DownloadButton({
    href,
    children,
}: {
    href: string
    children: ReactNode
}) {
    return (
        <div className="my-8 text-center">
            <a
                href={href}
                download
                className="inline-flex items-center gap-3 rounded-full bg-[#212121] px-8 py-4 text-base font-medium text-white transition-colors duration-200 no-underline hover:bg-black"
            >
                <Download className="w-5 h-5" />
                {children}
            </a>
        </div>
    )
}
