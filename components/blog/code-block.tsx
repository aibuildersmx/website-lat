'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * Code block — fixed dark surface (`#212121`, the brand warm black) on the
 * light page, matching the site's dark insets (footer, CTA). Monochrome only.
 */
interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  className?: string
}

export default function CodeBlock({ code, title, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`relative group my-6 rounded-xl border border-white/10 bg-[#212121] overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <span className="text-xs font-mono text-white/40">{title}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-white/50 hover:text-white"
            title="Copiar código"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md z-10 text-white/50 hover:text-white"
          title="Copiar código"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
      <pre className="p-4 sm:p-5 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed whitespace-pre text-white/70">
          {code}
        </code>
      </pre>
    </div>
  )
}
