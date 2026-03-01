import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DependencyPanel from './DependencyPanel'

describe('DependencyPanel', () => {
  it('renders dependency details and opens card from graph rows', async () => {
    const user = userEvent.setup()
    const onOpenCard = vi.fn()

    render(
      <DependencyPanel
        cards={[
          { id: 'a', title: 'Task A', dependencies: ['b'] },
          { id: 'b', title: 'Task B', dependencies: [] },
        ]}
        dependencyInsights={{
          cardById: {
            a: { id: 'a', title: 'Task A' },
            b: { id: 'b', title: 'Task B' },
          },
          blockedByByCardId: { a: [{ id: 'b', title: 'Task B', status: 'In Progress' }], b: [] },
          dependentsByCardId: { a: [], b: ['a'] },
          unresolvedCountByCardId: { a: 1, b: 0 },
          chainByCardId: { a: ['a', 'b'], b: ['b'] },
        }}
        onOpenCard={onOpenCard}
      />,
    )

    expect(screen.getByText(/blocked by: task b/i)).toBeInTheDocument()
    expect(screen.getByText(/chain: task a -> task b/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Task A' }))
    expect(onOpenCard).toHaveBeenCalledWith('a')
  })
})
