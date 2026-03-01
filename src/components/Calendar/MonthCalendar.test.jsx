import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MonthCalendar from './MonthCalendar'
import { monthLabel, parseDateKey } from '../../utils/date'

function makeProps(selectedDate) {
  return {
    cards: [],
    selectedDate,
    onSelectDate: vi.fn(),
    onDropCard: vi.fn(),
    onUpdateBlock: vi.fn(),
    onDeleteBlock: vi.fn(),
  }
}

describe('MonthCalendar', () => {
  it('syncs visible month when selectedDate changes externally', () => {
    const { rerender } = render(<MonthCalendar {...makeProps('2026-03-10')} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      monthLabel(parseDateKey('2026-03-10')),
    )

    rerender(<MonthCalendar {...makeProps('2026-05-10')} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      monthLabel(parseDateKey('2026-05-10')),
    )
  })

  it('filters visible day blocks by selected statuses', async () => {
    const user = userEvent.setup()
    render(
      <MonthCalendar
        cards={[
          {
            id: 'c1',
            title: 'Task backlog',
            description: '',
            status: 'Backlog',
            estimate_points: 4,
            due_date: null,
            dependencies: [],
            planned_day_blocks: [{ id: 'b1', date: '2026-03-10', points: 1 }],
            completed_points: 0,
          },
          {
            id: 'c2',
            title: 'Task done',
            description: '',
            status: 'Done',
            estimate_points: 4,
            due_date: null,
            dependencies: [],
            planned_day_blocks: [{ id: 'b2', date: '2026-03-10', points: 1 }],
            completed_points: 4,
          },
        ]}
        selectedDate="2026-03-10"
        onSelectDate={vi.fn()}
        onDropCard={vi.fn()}
        onUpdateBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('button', { name: /task backlog • 1pt/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /task done • 1pt/i }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getAllByRole('button', { name: /task backlog • 1pt/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /task done • 1pt/i })).not.toBeInTheDocument()
  })
})
