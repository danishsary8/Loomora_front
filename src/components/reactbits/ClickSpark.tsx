// Adapted from React Bits `ClickSpark` (github.com/DavidHDev/react-bits, src/ts-tailwind,
// MIT + Commons Clause). Trimmed: a fixed-size canvas over one control, fired on demand.
import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface ClickSparkProps {
  /** Increment to fire one burst from the centre. */
  burst: number
  color: string
  /** Positions the burst centre, e.g. `left-3 top-1/2`. */
  className: string
}

const SIZE = 72
const SPARKS = 8
const DURATION = 420
const RADIUS = 22

/** Short spark burst around a control (e.g. checking off a to-do). Off with reduced motion. */
export function ClickSpark({ burst, color, className }: ClickSparkProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!burst || reduced) return
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    ctx.canvas.width = SIZE * ratio
    ctx.canvas.height = SIZE * ratio
    ctx.scale(ratio, ratio)
    const start = performance.now()
    let frame = 0
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      const eased = t * (2 - t)
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.globalAlpha = 1 - t
      for (let i = 0; i < SPARKS; i += 1) {
        const angle = (Math.PI * 2 * i) / SPARKS
        const from = 10 + eased * RADIUS * 0.6
        const to = from + 7 * (1 - eased)
        ctx.beginPath()
        ctx.moveTo(SIZE / 2 + Math.cos(angle) * from, SIZE / 2 + Math.sin(angle) * from)
        ctx.lineTo(SIZE / 2 + Math.cos(angle) * to, SIZE / 2 + Math.sin(angle) * to)
        ctx.stroke()
      }
      if (t < 1) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    }
  }, [burst, color, reduced])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      style={{ width: SIZE, height: SIZE }}
      className={cn('pointer-events-none absolute -translate-x-1/2 -translate-y-1/2', className)}
    />
  )
}
