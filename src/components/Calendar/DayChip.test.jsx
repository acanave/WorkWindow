import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DayChip from './DayChip'

describe('DayChip', () => {
  it('syncs input value when block points change from outside', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onDelete = vi.fn()

    const { rerender } = render(
      <DayChip
        block={{ id: 'b1', cardId: 'c1', date: '2026-03-01', points: 2 }}
        cardTitle="Task"
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: /task • 2pt/i }))
    expect(screen.getByRole('spinbutton')).toHaveValue(2)

    rerender(
      <DayChip
        block={{ id: 'b1', cardId: 'c1', date: '2026-03-01', points: 5 }}
        cardTitle="Task"
        onUpdate={onUpdate}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByRole('spinbutton')).toHaveValue(5)
  })
})
