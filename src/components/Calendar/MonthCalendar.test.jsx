import { render, screen } from '@testing-library/react'
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
})
