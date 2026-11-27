// Adapted from React Bits `BlurText` (github.com/DavidHDev/react-bits, src/ts-tailwind,
// MIT + Commons Clause). Trimmed to word-by-word reveal on load; `motion.*` → LazyMotion `m.*`.
import { m, useReducedMotion } from 'framer-motion'

interface BlurTextProps {
  text: string
  className?: string
  /** Seconds between words. */
  stagger?: number
}

/** Landing hero only: each word fades in from a soft blur. Plain text with reduced motion. */
export function BlurText({ text, className, stagger = 0.08 }: BlurTextProps) {
  const reduced = useReducedMotion()
  if (reduced) return <span className={className}>{text}</span>
  const words = text.split(' ')
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <m.span
            key={`${word}-${index}`}
            className="inline-block will-change-[transform,filter,opacity]"
            initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, delay: index * stagger, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
            {index < words.length - 1 && ' '}
          </m.span>
        ))}
      </span>
    </span>
  )
}
