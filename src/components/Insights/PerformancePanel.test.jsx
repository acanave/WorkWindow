import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PerformancePanel from './PerformancePanel'

describe('PerformancePanel', () => {
  it('renders burnup and velocity values', () => {
    render(
      <PerformancePanel
        snapshot={{
          totals: { estimate: 10, completed: 4, planned: 6, remaining: 6 },
          burnupPct: 40,
          planCoveragePct: 100,
          velocity: { completedLast7d: 3, plannedNext7d: 5 },
          burndown: { remainingNow: 6, projectedRemainingIn7d: 1 },
        }}
      />,
    )

    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(screen.getByText('4/10 pts')).toBeInTheDocument()
    expect(screen.getByText('3 pts')).toBeInTheDocument()
    expect(screen.getByText('1 pts')).toBeInTheDocument()
  })
})
