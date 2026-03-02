import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CardModal from './CardModal'

function makeCard(overrides = {}) {
  return {
    id: 'c1',
    title: 'Task A',
    description: '',
    status: 'In Progress',
    estimate_points: 4,
    due_date: null,
    dependencies: ['c2'],
    planned_day_blocks: [],
    completed_points: 1,
    ...overrides,
  }
}

describe('CardModal', () => {
  it('shows unresolved blocked-by section in edit mode', () => {
    render(
      <CardModal
        mode="edit"
        card={makeCard()}
        allCards={[makeCard(), makeCard({ id: 'c2', title: 'Task B', status: 'Blocked', dependencies: [] })]}
        blockedBy={[{ id: 'c2', title: 'Task B', status: 'Blocked' }]}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLogProgress={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Blocked by' })).toBeInTheDocument()
    expect(screen.getByText('Task B (Blocked)')).toBeInTheDocument()
  })
})
