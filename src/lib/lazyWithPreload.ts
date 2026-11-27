import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

// Same constraint as React's own `lazy`: props are checked where the component is rendered.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

/** `React.lazy` that can also fetch its chunk early (on idle or on pointerdown). */
export function lazyWithPreload<C extends AnyComponent>(
  load: () => Promise<{ default: C }>,
): LazyExoticComponent<C> & { preload: () => Promise<unknown> } {
  let pending: Promise<{ default: C }> | undefined
  const preload = () => (pending ??= load())
  return Object.assign(lazy(preload), { preload })
}

/** Runs `task` when the browser is idle (or on the next tick without `requestIdleCallback`). */
export function runWhenIdle(task: () => void, timeout = 2000): () => void {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(task, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = globalThis.setTimeout(task, 0)
  return () => globalThis.clearTimeout(id)
}
