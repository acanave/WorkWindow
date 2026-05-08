import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import KanbanBoard from './KanbanBoard'

const noop = vi.fn()

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'c1',
    title: overrides.title || 'Untitled',
    description: overrides.description || '',
    status: overrides.status || 'Backlog',
    estimate_points: overrides.estimate_points || 4,
    due_date: overrides.due_date ?? null,
    dependencies: overrides.dependencies || [],
    planned_day_blocks: overrides.planned_day_blocks || [],
    completed_points: overrides.completed_points || 0,
  }
}

function renderBoard(cards, riskByCardId = {}, chainDepthByCardId = {}, hasCycleByCardId = {}) {
  return render(
    <KanbanBoard
      cards={cards}
      selectedDate="2026-03-10"
      unresolvedMap={{}}
      chainDepthByCardId={chainDepthByCardId}
      hasCycleByCardId={hasCycleByCardId}
      riskByCardId={riskByCardId}
      onCreateCard={noop}
      onOpenCard={noop}
      onMoveCard={noop}
      onLogProgress={noop}
      onPlanCardToSelectedDate={noop}
    />,
  )
}

describe('KanbanBoard', () => {
  it('filters cards by search query', async () => {
    const user = userEvent.setup()
    renderBoard([
      makeCard({ id: 'c1', title: 'Alpha task', description: 'api work' }),
      makeCard({ id: 'c2', title: 'Beta task', description: 'ui work' }),
    ])

    expect(screen.getByText('Alpha task')).toBeInTheDocument()
    expect(screen.getByText('Beta task')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/search cards/i), 'beta')

    expect(screen.queryByText('Alpha task')).not.toBeInTheDocument()
    expect(screen.getByText('Beta task')).toBeInTheDocument()
  })

  it('sorts cards by earliest due date first', async () => {
    const user = userEvent.setup()
    renderBoard([
      makeCard({ id: 'c1', title: 'No due', due_date: null }),
      makeCard({ id: 'c2', title: 'Due later', due_date: '2026-04-10' }),
      makeCard({ id: 'c3', title: 'Due sooner', due_date: '2026-03-20' }),
    ])

    await user.selectOptions(screen.getByLabelText(/sort cards/i), 'due_asc')

    const backlogHeading = screen.getByRole('heading', { level: 3, name: 'Backlog' })
    const backlogSection = backlogHeading.closest('section')
    const titles = within(backlogSection)
      .getAllByRole('heading', { level: 4 })
      .map((node) => node.textContent)

    expect(titles).toEqual(['Due sooner', 'Due later', 'No due'])
  })

  it('shows risk badge for cards with due-date shortfall', () => {
    renderBoard([makeCard({ id: 'c1', title: 'At risk task' })], {
      c1: {
        kind: 'at_risk',
        dueDate: '2026-03-10',
        remainingPoints: 4,
        plannedBeforeDue: 2,
        shortfall: 2,
      },
    })

    expect(screen.getByText('Short 2pt')).toBeInTheDocument()
  })

  it('shows chain depth and cycle badges', () => {
    renderBoard(
      [makeCard({ id: 'c1', title: 'Chained task' }), makeCard({ id: 'c2', title: 'Cycle task' })],
      {},
      { c1: 3, c2: 2 },
      { c2: true },
    )

    expect(screen.getByText('Chain 3 deep')).toBeInTheDocument()
    expect(screen.getByText('Cycle')).toBeInTheDocument()
  })

  it('plans a card to the selected day with the touch fallback action', async () => {
    const user = userEvent.setup()
    const onPlanCardToSelectedDate = vi.fn()

    render(
      <KanbanBoard
        cards={[makeCard({ id: 'c1', title: 'Touch task' })]}
        selectedDate="2026-03-10"
        unresolvedMap={{}}
        chainDepthByCardId={{}}
        hasCycleByCardId={{}}
        riskByCardId={{}}
        onCreateCard={noop}
        onOpenCard={noop}
        onMoveCard={noop}
        onLogProgress={noop}
        onPlanCardToSelectedDate={onPlanCardToSelectedDate}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add window 2026-03-10/i }))

    expect(onPlanCardToSelectedDate).toHaveBeenCalledWith('c1')
  })

  it('moves a card with the touch fallback status menu', async () => {
    const user = userEvent.setup()
    const onMoveCard = vi.fn()

    render(
      <KanbanBoard
        cards={[makeCard({ id: 'c1', title: 'Touch task' })]}
        selectedDate="2026-03-10"
        unresolvedMap={{}}
        chainDepthByCardId={{}}
        hasCycleByCardId={{}}
        riskByCardId={{}}
        onCreateCard={noop}
        onOpenCard={noop}
        onMoveCard={onMoveCard}
        onLogProgress={noop}
        onPlanCardToSelectedDate={noop}
      />,
    )

    await user.selectOptions(screen.getByLabelText(/move touch task/i), 'Blocked')

    expect(onMoveCard).toHaveBeenCalledWith('c1', 'Blocked')
  })
})
