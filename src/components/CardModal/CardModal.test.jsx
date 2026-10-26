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
    expect(screen.getByRole('dialog', { name: 'Edit Work Item' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('contains keyboard focus and closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <CardModal
        mode="create"
        card={null}
        allCards={[]}
        onClose={onClose}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLogProgress={vi.fn()}
      />,
    )

    const closeButton = screen.getByRole('button', { name: 'Close' })
    closeButton.focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Create' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
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

    await user.click(screen.getByRole('button', { name: /schedule work time/i }))
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

  it('prefills the deadline when creating from a selected calendar date', () => {
    render(
      <CardModal
        mode="create"
        card={null}
        initialDate="2026-05-11"
        allCards={[]}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLogProgress={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Deadline')).toHaveValue('2026-05-11')
  })

  it('keeps scheduling and dependencies optional until needed', async () => {
    const user = userEvent.setup()

    render(
      <CardModal
        mode="create"
        card={null}
        allCards={[makeCard()]}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLogProgress={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Start')).not.toBeInTheDocument()
    expect(screen.queryByText('Task A')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /schedule work time/i }))
    await user.click(screen.getByRole('button', { name: /dependencies/i }))

    expect(screen.getByLabelText('Start')).toBeInTheDocument()
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: /estimated effort/i })).toHaveValue(4)
  })

  it('requires confirmation before deleting a work item', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const onClose = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <CardModal
        mode="edit"
        card={makeCard()}
        allCards={[makeCard()]}
        blockedBy={[]}
        onClose={onClose}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
        onLogProgress={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete Card' }))
    expect(confirmSpy).toHaveBeenCalledWith('Delete “Task A”? This cannot be undone.')
    expect(onDelete).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Delete Card' }))
    expect(onDelete).toHaveBeenCalledWith('c1')
    expect(onClose).toHaveBeenCalledOnce()
    confirmSpy.mockRestore()
  })
})
