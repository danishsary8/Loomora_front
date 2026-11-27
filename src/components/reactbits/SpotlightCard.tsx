// Adapted from React Bits `SpotlightCard` (github.com/DavidHDev/react-bits, src/ts-tailwind,
// MIT + Commons Clause). Trimmed to the circle spotlight; colours come from design tokens.
import { useRef, type HTMLAttributes, type PointerEvent } from 'react'
import { cn } from '@/lib/cn'

type SpotlightCardProps = HTMLAttributes<HTMLDivElement> & {
  /** Any CSS colour; use a token-derived value. */
  spotlightColor: string
}

/** Card with a soft light that follows the pointer (fine pointers only; static on touch). */
export function SpotlightCard({
  spotlightColor,
  className,
  children,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  function move(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current
    if (!node || event.pointerType !== 'mouse') return
    const box = node.getBoundingClientRect()
    node.style.setProperty('--spot-x', `${event.clientX - box.left}px`)
    node.style.setProperty('--spot-y', `${event.clientY - box.top}px`)
  }
  return (
    <div
      ref={ref}
      onPointerMove={move}
      className={cn('group relative overflow-hidden', className)}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-slow ease-elemental group-hover:opacity-100"
        style={{
          background: `radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 70%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
