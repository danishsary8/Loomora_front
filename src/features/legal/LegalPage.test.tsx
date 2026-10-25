import { screen } from '@testing-library/react'
import { renderRoute } from '@/test/renderRoute'

describe.each([
  ['/privacy', 'Privacy', 'Where your data lives'],
  ['/terms', 'Terms', 'Using Loomora'],
])('%s', (path, title, firstSection) => {
  it('has real content, a date and sections', async () => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(/^Last updated:/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: firstSection })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })
})

it('privacy says the data stays on the device', async () => {
  renderRoute('/privacy')
  expect(await screen.findByText(/saved on your own device/)).toBeInTheDocument()
})
