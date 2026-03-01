import { describe, expect, it } from 'vitest'
import { getCardRisk } from './risk'

function makeCard(overrides = {}) {
  return {
    id: 'c1',
    title: 'Task',
    description: '',
    status: 'In Progress',
    estimate_points: 5,
    due_date: '2026-03-10',
    dependencies: [],
    planned_day_blocks: [],
    completed_points: 1,
    ...overrides,
  }
}

describe('getCardRisk', () => {
  it('returns overdue when due date is before today and work remains', () => {
    const risk = getCardRisk(makeCard({ due_date: '2026-03-01' }), '2026-03-05')
    expect(risk?.kind).toBe('overdue')
    expect(risk?.shortfall).toBe(4)
  })

  it('returns at_risk when planned points before due date are short', () => {
    const risk = getCardRisk(
      makeCard({
        due_date: '2026-03-10',
        planned_day_blocks: [{ id: 'b1', date: '2026-03-09', points: 2 }],
      }),
      '2026-03-05',
    )

    expect(risk?.kind).toBe('at_risk')
    expect(risk?.remainingPoints).toBe(4)
    expect(risk?.plannedBeforeDue).toBe(2)
    expect(risk?.shortfall).toBe(2)
  })

  it('returns null when due-date plan covers remaining work', () => {
    const risk = getCardRisk(
      makeCard({
        due_date: '2026-03-10',
        planned_day_blocks: [{ id: 'b1', date: '2026-03-10', points: 4 }],
      }),
      '2026-03-05',
    )

    expect(risk).toBeNull()
  })

  it('returns null without due date', () => {
    const risk = getCardRisk(makeCard({ due_date: null }), '2026-03-05')
    expect(risk).toBeNull()
  })
})
