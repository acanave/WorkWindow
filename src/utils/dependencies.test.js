import { describe, expect, it } from 'vitest'
import { buildDependencyInsights } from './dependencies'

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'c1',
    title: overrides.title || 'Task',
    description: '',
    status: overrides.status || 'Backlog',
    estimate_points: 4,
    due_date: null,
    dependencies: overrides.dependencies || [],
    planned_day_blocks: [],
    completed_points: 0,
  }
}

describe('buildDependencyInsights', () => {
  it('calculates unresolved blockers and chain depth', () => {
    const cards = [
      makeCard({ id: 'a', title: 'A', dependencies: ['b'] }),
      makeCard({ id: 'b', title: 'B', dependencies: ['c'] }),
      makeCard({ id: 'c', title: 'C' }),
    ]

    const insights = buildDependencyInsights(cards)

    expect(insights.unresolvedCountByCardId.a).toBe(1)
    expect(insights.chainDepthByCardId.a).toBe(2)
    expect(insights.chainByCardId.a).toEqual(['a', 'b', 'c'])
    expect(insights.blockedByByCardId.a.map((card) => card.id)).toEqual(['b'])
    expect(insights.dependentsByCardId.b).toEqual(['a'])
  })

  it('flags dependency cycles', () => {
    const cards = [
      makeCard({ id: 'a', title: 'A', dependencies: ['b'] }),
      makeCard({ id: 'b', title: 'B', dependencies: ['a'] }),
    ]

    const insights = buildDependencyInsights(cards)

    expect(insights.hasCycleByCardId.a).toBe(true)
    expect(insights.hasCycleByCardId.b).toBe(true)
  })
})
