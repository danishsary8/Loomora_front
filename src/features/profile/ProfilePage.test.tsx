import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

async function openProfile() {
  const { repo } = createTestRepository()
  renderRoute('/profile', repo)
  await screen.findByRole('heading', { level: 1, name: 'Profile' })
  return repo
}

describe('Profile for guests (S9)', () => {
  it('says the data lives on this device only', async () => {
    await openProfile()
    expect(screen.getByText('Data lives on this device only.')).toBeInTheDocument()
  })

  it('shows the streak and whether today counted', async () => {
    await openProfile()
    expect(await screen.findByText('0 days')).toBeInTheDocument()
    expect(screen.getByText('Check off one item today to keep it going.')).toBeInTheDocument()
  })

  it('shows today as counted after a check-off', async () => {
    const { repo } = createTestRepository()
    const todo = await repo.create({ title: 'Read' })
    await repo.setDone(todo.id, true)
    renderRoute('/profile', repo)
    expect(await screen.findByText('1 day')).toBeInTheDocument()
    expect(screen.getByText('Today counted.')).toBeInTheDocument()
  })

  it('keeps "Save your plan" disabled until accounts exist', async () => {
    await openProfile()
    const save = screen.getByRole('button', { name: 'Save your plan' })
    expect(save).toBeDisabled()
    expect(save).toHaveAccessibleDescription('Accounts are coming soon.')
  })

  it('opens and closes the feedback sheet', async () => {
    await openProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    const sheet = await screen.findByRole('dialog', { name: 'Send feedback' })
    const message = within(sheet).getByLabelText('Your message')
    await userEvent.type(message, 'The week view is great')
    expect(message).toHaveValue('The week view is great')
    expect(within(sheet).getByRole('button', { name: 'Send' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
