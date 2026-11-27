import { lazyWithPreload, runWhenIdle } from './lazyWithPreload'

describe('lazyWithPreload', () => {
  it('loads the chunk once, however often preload is called', async () => {
    const load = vi.fn(() => Promise.resolve({ default: () => null }))
    const Page = lazyWithPreload(load)
    expect(load).not.toHaveBeenCalled()
    await Promise.all([Page.preload(), Page.preload()])
    expect(load).toHaveBeenCalledTimes(1)
  })
})

describe('runWhenIdle', () => {
  it('runs the task on idle and can be cancelled', () => {
    vi.useFakeTimers()
    const task = vi.fn()
    runWhenIdle(task)
    const cancelled = vi.fn()
    runWhenIdle(cancelled)()
    vi.runAllTimers()
    expect(task).toHaveBeenCalledTimes(1)
    expect(cancelled).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
