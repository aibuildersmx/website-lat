'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, Copy } from 'lucide-react'

/* ── Palette ──
   Fixed monochrome dark surface (`#212121`, the brand warm black) on the
   light page. No color: traffic lights and prompt are white opacities. */
const palette = {
  base:     '#212121',
  border:   'rgba(255, 255, 255, 0.1)',
  titleBar: 'rgba(255, 255, 255, 0.03)',
  overlay0: 'rgba(255, 255, 255, 0.4)',  // title, comment
  overlay1: 'rgba(255, 255, 255, 0.55)', // copy button
  command:  'rgba(255, 255, 255, 0.92)', // typed command + cursor
  prompt:   'rgba(255, 255, 255, 0.4)',  // $ symbol
  output:   'rgba(255, 255, 255, 0.7)',  // output lines
  light:    'rgba(255, 255, 255, 0.2)',  // window traffic lights
}

interface TerminalLine {
  type: 'command' | 'output' | 'comment' | 'empty'
  text: string
  delay?: number
}

interface TerminalProps {
  title?: string
  lines: TerminalLine[]
  className?: string
}

function AnimatedLine({ line, isVisible }: { line: TerminalLine; isVisible: boolean; index: number }) {
  const [displayedChars, setDisplayedChars] = useState(0)

  useEffect(() => {
    if (!isVisible || line.type !== 'command') {
      return
    }

    const text = line.text
    let charIndex = 0

    const interval = setInterval(() => {
      charIndex++
      setDisplayedChars(charIndex)
      if (charIndex >= text.length) {
        clearInterval(interval)
      }
    }, 25)

    return () => clearInterval(interval)
  }, [isVisible, line.type, line.text])

  if (!isVisible && line.type === 'command') return null
  if (!isVisible && line.type !== 'command') return null
  const showCursor = line.type === 'command' && displayedChars < line.text.length

  if (line.type === 'empty') return <div className="h-4" />

  if (line.type === 'comment') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-sm leading-relaxed"
        style={{ color: palette.overlay0 }}
      >
        {line.text}
      </motion.div>
    )
  }

  if (line.type === 'command') {
    return (
      <div className="flex items-start gap-2 text-sm leading-relaxed">
        <span className="shrink-0 select-none" style={{ color: palette.prompt }}>$</span>
        <span style={{ color: palette.command }}>
          {line.text.slice(0, displayedChars)}
          {showCursor && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
              className="inline-block w-[7px] h-[14px] ml-px translate-y-[2px]"
              style={{ backgroundColor: palette.command }}
            />
          )}
        </span>
      </div>
    )
  }

  // output
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-sm leading-relaxed whitespace-pre-wrap pl-5"
      style={{ color: palette.output }}
    >
      {line.text}
    </motion.div>
  )
}

export default function Terminal({ title = '~/terminal', lines, className = '' }: TerminalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [copied, setCopied] = useState(false)

  const commandText = lines
    .filter(l => l.type === 'command')
    .map(l => l.text)
    .join('\n')

  useEffect(() => {
    if (!isInView) return

    let currentLine = 0
    const timers: NodeJS.Timeout[] = []

    function showNextLine() {
      if (currentLine >= lines.length) return

      const line = lines[currentLine]
      const lineIndex = currentLine

      setVisibleLines(lineIndex + 1)

      let delay = line.delay ?? 0
      if (line.type === 'command') {
        delay = Math.max(delay, line.text.length * 25 + 400)
      } else if (line.type === 'output') {
        delay = Math.max(delay, 200)
      } else {
        delay = Math.max(delay, 100)
      }

      currentLine++
      timers.push(setTimeout(showNextLine, delay))
    }

    showNextLine()

    return () => timers.forEach(clearTimeout)
  }, [isInView, lines])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(commandText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      ref={ref}
      className={`relative group my-6 rounded-xl border overflow-hidden ${className}`}
      style={{ backgroundColor: palette.base, borderColor: palette.border }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: palette.border, backgroundColor: palette.titleBar }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.light }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.light }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.light }} />
          </div>
          <span className="ml-3 text-xs font-mono" style={{ color: palette.overlay0 }}>{title}</span>
        </div>
        {commandText && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md"
            style={{ color: palette.overlay1 }}
            title="Copiar comandos"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Terminal body */}
      <div className="p-4 sm:p-5 font-mono space-y-1 min-h-[60px] overflow-x-auto">
        {lines.map((line, i) => (
          <AnimatedLine
            key={i}
            line={line}
            isVisible={i < visibleLines}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
