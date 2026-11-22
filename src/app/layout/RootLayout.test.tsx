import { act, cleanup, screen, waitFor } from '@testing-library/react'
import { usePwaUpdate } from '@/app/pwaUpdate'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

describe('RootLayout deferred overlays', () => {
  afterEach(() => {
    cleanup()
    usePwaUpdate.getState().reset()
  })

  it('loads ReminderWatcher after idle on the landing route', async () => {
    const { repo } = createTestRepository()
    await repo.create({ title: 'Landing reminder', remind_at: '2020-01-01T00:00:00.000Z' })
    renderRoute('/', repo)

    expect(await screen.findByRole('heading', { level: 1, name: 'Loomora' })).toBeInTheDocument()
    const banner = await screen.findByRole('region', { name: 'Reminder' })
    expect(banner).toHaveTextContent('Landing reminder')
  })

  it('mounts PwaUpdateBanner lazily when an update becomes available', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Loomora' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'App update' })).not.toBeInTheDocument()

    act(() => {
      usePwaUpdate.getState().notifyAvailable({ postMessage: vi.fn() } as unknown as ServiceWorker)
    })

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'App update' })).toBeInTheDocument()
    })
  })
})
