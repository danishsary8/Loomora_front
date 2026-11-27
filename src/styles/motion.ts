import type { Transition, Variants } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * Shared Elemental Edition motion foundation (DEC-003).
 * Durations: 160 / 200 / 240 ms with one calm ease-out curve.
 * Every preset provides a zero-movement fallback when `reduced` is true.
 */
export const MOTION_DURATION = {
  fast: 0.16,
  base: 0.2,
  slow: 0.24,
} as const

export const MOTION_EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

export const LIST_STAGGER_SECONDS = 0.03

const INSTANT_TRANSITION: Transition = { duration: 0 }

/** Screen enter: calm opacity fade + 8 px rise (no movement under reduced motion). */
export function pageEnterMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
      transition: INSTANT_TRANSITION,
    }
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
  }
}

/** Staggered list container (30 ms between children). */
export function listStaggerContainer(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1, transition: INSTANT_TRANSITION },
    }
  }
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: LIST_STAGGER_SECONDS },
    },
  }
}

/** Child item for `listStaggerContainer`. */
export function listStaggerItem(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0, transition: INSTANT_TRANSITION },
    }
  }
  return {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
    },
  }
}

/** Bottom sheet backdrop fade. */
export function sheetBackdropMotion(reduced: boolean) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: reduced ? INSTANT_TRANSITION : { duration: MOTION_DURATION.fast },
  }
}

/** Bottom sheet spring slide-up (fade only under reduced motion). */
export function sheetPanelMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: INSTANT_TRANSITION,
    }
  }
  return {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 36,
      mass: 0.85,
    },
  }
}

/** Tactile press scale (0.97) for Framer Motion interactive elements. */
export function pressTapProps(reduced: boolean) {
  if (reduced) {
    return {
      whileTap: undefined,
      transition: INSTANT_TRANSITION,
    }
  }
  return {
    whileTap: { scale: 0.97 },
    transition: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
  }
}

/** Check-off pop for completion badges/stamps. */
export function checkOffPopMotion(reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: INSTANT_TRANSITION,
    }
  }
  return {
    initial: { opacity: 0, scale: 1.28, rotate: -8 },
    animate: { opacity: 1, scale: 1, rotate: -4 },
    exit: { opacity: 0 },
    transition: {
      type: 'spring' as const,
      stiffness: 460,
      damping: 24,
      mass: 0.7,
    },
  }
}

/** Progress ring stroke / progress bar draw-in transition. */
export function progressDrawTransition(reduced: boolean): Transition {
  if (reduced) return INSTANT_TRANSITION
  return { duration: MOTION_DURATION.slow, ease: MOTION_EASE }
}

/**
 * Smooth numeric count-up for KPI values.
 * Returns `target` immediately with zero animation frames when `reduced` is true.
 */
export function useCountUp(
  target: number,
  options: { reduced?: boolean; durationMs?: number } = {},
): number {
  const { reduced = false, durationMs = 240 } = options
  const safeTarget = Number.isFinite(target) ? target : 0
  const [display, setDisplay] = useState(safeTarget)
  const previousRef = useRef(safeTarget)

  useEffect(() => {
    const startValue = previousRef.current
    if (reduced || durationMs <= 0 || startValue === safeTarget) {
      previousRef.current = safeTarget
      setDisplay(safeTarget)
      return
    }

    let rafId = 0
    const startTime = performance.now()
    const delta = safeTarget - startValue

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      const nextValue = Math.round(startValue + delta * eased)
      setDisplay(nextValue)
      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        previousRef.current = safeTarget
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      previousRef.current = safeTarget
    }
  }, [safeTarget, reduced, durationMs])

  return reduced ? safeTarget : display
}
