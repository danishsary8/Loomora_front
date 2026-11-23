import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { Sheet } from './Sheet'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a to-do">
        <input aria-label="Title" />
      </Sheet>
    </>
  )
}

function FocusHarness() {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Sheet open onClose={() => {}} title="Focus" initialFocusRef={ref}>
      <button>First</button>
      <input ref={ref} aria-label="Target" />
    </Sheet>
  )
}

describe('Sheet', () => {
  it('focuses initialFocusRef instead of the first focusable element', () => {
    render(<FocusHarness />)
    expect(screen.getByLabelText('Target')).toHaveFocus()
  })

  it('opens as a labelled modal dialog and moves focus inside', async () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a to-do' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('closes on Escape and returns focus to the opener', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(opener)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  it('closes from the close button and the backdrop', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(screen.getByTestId('sheet-backdrop'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('moves focus to #main when the opener unmounts before the sheet closes', async () => {
    function UnmountingHarness() {
      const [open, setOpen] = useState(false)
      const [showOpener, setShowOpener] = useState(true)
      return (
        <main id="main" tabIndex={-1}>
          {showOpener && <button onClick={() => setOpen(true)}>Start</button>}
          <Sheet open={open} onClose={() => setOpen(false)} title="Add a to-do">
            <button
              onClick={() => {
                setShowOpener(false)
                setOpen(false)
              }}
            >
              Submit
            </button>
          </Sheet>
        </main>
      )
    }

    render(<UnmountingHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('keeps Tab focus inside the sheet', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 4; i++) {
      await userEvent.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('marks background siblings inert while open without disabling the dialog', async () => {
    const { container } = render(<Harness />)
    expect(container).not.toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a to-do' })
    expect(container).toHaveAttribute('inert')
    expect(dialog).not.toHaveAttribute('inert')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(container).not.toHaveAttribute('inert')
  })

  it('isolates root-level notification regions containing buttons while open and restores them on close', async () => {
    function RootNotificationHarness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <section aria-label="App update">
            <button type="button">Update now</button>
            <button type="button">Later</button>
          </section>
          <section aria-label="Reminder">
            <button type="button">Done</button>
          </section>
          <main id="main" tabIndex={-1}>
            <button type="button" onClick={() => setOpen(true)}>
              Open sheet
            </button>
          </main>
          <Sheet open={open} onClose={() => setOpen(false)} title="Modal sheet">
            <input aria-label="Field" />
          </Sheet>
        </>
      )
    }

    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    try {
      render(<RootNotificationHarness />, { container: root })
      expect(root).not.toHaveAttribute('inert')

      const opener = screen.getByRole('button', { name: 'Open sheet' })
      await userEvent.click(opener)

      const dialog = screen.getByRole('dialog', { name: 'Modal sheet' })
      expect(root).toHaveAttribute('inert')
      expect(dialog).not.toHaveAttribute('inert')
      expect(dialog.closest('[inert]')).toBeNull()
      // Notification regions stay mounted/visible in the DOM, but locked inside inert #root.
      expect(root.querySelector('section[aria-label="App update"]')).toBeInTheDocument()
      expect(root.querySelector('section[aria-label="Reminder"]')).toBeInTheDocument()

      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(root).not.toHaveAttribute('inert')
      expect(opener).toHaveFocus()
    } finally {
      root.remove()
    }
  })

  it('keeps background inert while overlapping sheets exist and unlocks only when the last closes', async () => {
    function MultiSheetHarness() {
      const [firstOpen, setFirstOpen] = useState(false)
      const [secondOpen, setSecondOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setFirstOpen(true)}>
            Open first
          </button>
          <Sheet open={firstOpen} onClose={() => setFirstOpen(false)} title="First sheet">
            <button type="button" onClick={() => setSecondOpen(true)}>
              Open second
            </button>
            <button type="button" onClick={() => setFirstOpen(false)}>
              Close first
            </button>
          </Sheet>
          <Sheet open={secondOpen} onClose={() => setSecondOpen(false)} title="Second sheet">
            <button type="button" onClick={() => setSecondOpen(false)}>
              Close second
            </button>
          </Sheet>
        </>
      )
    }

    const { container } = render(<MultiSheetHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open first' }))
    expect(container).toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Open second' }))
    expect(container).toHaveAttribute('inert')
    expect(screen.getByRole('dialog', { name: 'Second sheet' }).closest('[inert]')).toBeNull()

    // Closing the first sheet while the second is still open keeps the background inert.
    await userEvent.click(screen.getByRole('button', { name: 'Close first' }))
    expect(container).toHaveAttribute('inert')

    // Closing the second sheet unlocks the background cleanly.
    await userEvent.click(screen.getByRole('button', { name: 'Close second' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(container).not.toHaveAttribute('inert')
  })
})
