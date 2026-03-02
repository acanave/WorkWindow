import { describe, expect, it } from 'vitest'
import { buildPerformanceSnapshot } from './metrics'

function makeCard(overrides = {}) {
  return {
    id: overrides.id || 'c1',
    title: 'Task',
    description: '',
    status: 'In Progress',
    estimate_points: 5,
    due_date: null,
    dependencies: [],
    planned_day_blocks: [],
    completed_points: 0,
    progress_log: [],
    ...overrides,
  }
}

describe('buildPerformanceSnapshot', () => {
  it('computes totals and burnup coverage', () => {
    const snapshot = buildPerformanceSnapshot(
      [
        makeCard({
          estimate_points: 8,
          completed_points: 3,
          planned_day_blocks: [{ id: 'b1', date: '2026-03-01', points: 2 }],
        }),
        makeCard({
          id: 'c2',
          estimate_points: 4,
          completed_points: 2,
          planned_day_blocks: [{ id: 'b2', date: '2026-03-03', points: 3 }],
        }),
      ],
      '2026-03-01',
    )

    expect(snapshot.totals.estimate).toBe(12)
    expect(snapshot.totals.completed).toBe(5)
    expect(snapshot.totals.remaining).toBe(7)
    expect(snapshot.totals.planned).toBe(5)
    expect(snapshot.burnupPct).toBe(42)
    expect(snapshot.planCoveragePct).toBe(71)
  })

  it('computes 7-day velocity and burndown forecast from progress logs and plan', () => {
    const snapshot = buildPerformanceSnapshot(
      [
        makeCard({
          estimate_points: 10,
          completed_points: 2,
          progress_log: [
            { id: 'p1', date: '2026-02-20', delta: 5 },
            { id: 'p2', date: '2026-02-27', delta: 1 },
            { id: 'p3', date: '2026-03-01', delta: 1 },
            { id: 'p4', date: '2026-03-04', delta: 2 },
          ],
          planned_day_blocks: [
            { id: 'b1', date: '2026-03-01', points: 2 },
            { id: 'b2', date: '2026-03-05', points: 3 },
            { id: 'b3', date: '2026-03-12', points: 2 },
          ],
        }),
      ],
      '2026-03-01',
    )

    expect(snapshot.velocity.completedLast7d).toBe(2)
    expect(snapshot.velocity.plannedNext7d).toBe(5)
    expect(snapshot.burndown.remainingNow).toBe(8)
    expect(snapshot.burndown.projectedRemainingIn7d).toBe(3)
  })
})
