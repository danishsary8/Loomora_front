// Adapted from React Bits `CountUp` (github.com/DavidHDev/react-bits, src/ts-tailwind,
// MIT + Commons Clause). Trimmed to the props Loomora uses; `motion/react` → `framer-motion`.
import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

interface CountUpProps {
  to: number
  /** Seconds. */
  duration?: number
  className?: string
  format?: (value: number) => string
}

const defaultFormat = (value: number) => String(Math.round(value))
const canObserve = () => typeof IntersectionObserver !== 'undefined'

/** True once the element has been on screen (never, where IntersectionObserver is missing). */
function useSeen(ref: RefObject<Element>) {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || !canObserve()) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true)
        observer.disconnect()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return seen
}

/**
 * Counts up from 0 the first time it scrolls into view, then eases between later values.
 * Renders the final value straight away with reduced motion or without IntersectionObserver.
 */
export function CountUp({ to, duration = 0.9, className, format = defaultFormat }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useSeen(ref)
  const reduced = Boolean(useReducedMotion())
  const target = Number.isFinite(to) ? to : 0
  const shown = useRef<number | null>(null)

  // Before first paint: start at 0 so the number never flashes its final value first.
  useLayoutEffect(() => {
    if (!ref.current || reduced || !canObserve()) return
    shown.current = 0
    ref.current.textContent = format(0)
    // Only on mount; later updates animate from the shown value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node || shown.current === null) return
    if (reduced) {
      shown.current = target
      node.textContent = format(target)
      return
    }
    if (!inView) return
    const controls = animate(shown.current, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        shown.current = value
        node.textContent = format(value)
      },
    })
    return () => controls.stop()
  }, [duration, format, inView, reduced, target])

  return (
    <span ref={ref} className={className}>
      {format(target)}
    </span>
  )
}
