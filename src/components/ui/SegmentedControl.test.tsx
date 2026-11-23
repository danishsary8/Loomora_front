import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
] as const

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState<'12h' | '24h'>('24h')
  return (
    <SegmentedControl
      label="Clock format"
      options={OPTIONS}
      value={value}
      onChange={setValue}
      disabled={disabled}
    />
  )
}

describe('SegmentedControl', () => {
  it('renders a labelled group with pressed state and switches on click/keyboard', async () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Clock format' })).toBeInTheDocument()

    const twelve = screen.getByRole('button', { name: '12-hour' })
    const twentyFour = screen.getByRole('button', { name: '24-hour' })
    expect(twelve).toHaveAttribute('aria-pressed', 'false')
    expect(twentyFour).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(twelve)
    expect(twelve).toHaveAttribute('aria-pressed', 'true')
    expect(twentyFour).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables all options when disabled is true', async () => {
    render(<Harness disabled />)
    const twelve = screen.getByRole('button', { name: '12-hour' })
    const twentyFour = screen.getByRole('button', { name: '24-hour' })
    expect(twelve).toBeDisabled()
    expect(twentyFour).toBeDisabled()
    await userEvent.click(twelve)
    expect(twentyFour).toHaveAttribute('aria-pressed', 'true')
  })
})
