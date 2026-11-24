import { useEffect, useState } from 'react'

/** Whether the element is wider than its box, so keyboard users need a focusable scroller. */
export function useHorizontalOverflow(element: HTMLElement | null): boolean {
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    measure()
    return () => observer.disconnect()
  }, [element])
  return overflowing
}
