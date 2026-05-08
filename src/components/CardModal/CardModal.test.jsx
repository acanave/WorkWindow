import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('saves a manual cross-day work window from range fields', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(
      <CardModal
        mode="edit"
        card={makeCard({ dependencies: [] })}
        allCards={[makeCard({ dependencies: [] })]}
        blockedBy={[]}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onLogProgress={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Start'), '2026-05-11')
    await user.type(screen.getByLabelText('End'), '2026-05-14')
    await user.clear(screen.getByLabelText('Pts/day'))
    await user.type(screen.getByLabelText('Pts/day'), '2')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onUpdate).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        due_date: '2026-05-14',
        planned_day_blocks: [
          { date: '2026-05-11', points: 2 },
          { date: '2026-05-12', points: 2 },
          { date: '2026-05-13', points: 2 },
          { date: '2026-05-14', points: 2 },
        ],
      }),
    )
  })
})
