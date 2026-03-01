import { addDays, formatDateKey, parseDateKey } from './date'

export function buildPerformanceSnapshot(cards, todayKey = formatDateKey(new Date())) {
  const totals = cards.reduce(
    (acc, card) => {
      const planned = card.planned_day_blocks.reduce((sum, block) => sum + block.points, 0)
      acc.estimate += card.estimate_points
      acc.completed += card.completed_points
      acc.planned += planned
      return acc
    },
    { estimate: 0, completed: 0, planned: 0 },
  )

  totals.remaining = Math.max(0, totals.estimate - totals.completed)

  const recentRange = buildDateRange(todayKey, -6, 0)
  const upcomingRange = buildDateRange(todayKey, 0, 6)
  const progressDeltas = cards.flatMap((card) => (Array.isArray(card.progress_log) ? card.progress_log : []))

  const completedLast7d = progressDeltas.reduce((sum, entry) => {
    if (!recentRange.has(entry.date)) return sum
    return sum + entry.delta
  }, 0)

  const plannedNext7d = cards.reduce((sum, card) => {
    return (
      sum +
      card.planned_day_blocks.reduce((blockSum, block) => {
        if (upcomingRange.has(block.date)) return blockSum + block.points
        return blockSum
      }, 0)
    )
  }, 0)

  const burnupPct = totals.estimate === 0 ? 0 : Math.round((totals.completed / totals.estimate) * 100)
  const planCoveragePct =
    totals.remaining === 0 ? 100 : Math.round(Math.min(1, totals.planned / totals.remaining) * 100)

  return {
    totals,
    burnupPct,
    planCoveragePct,
    velocity: {
      completedLast7d,
      plannedNext7d,
    },
    burndown: {
      remainingNow: totals.remaining,
      projectedRemainingIn7d: Math.max(0, totals.remaining - plannedNext7d),
    },
  }
}

function buildDateRange(anchorDateKey, startOffset, endOffset) {
  const anchor = parseDateKey(anchorDateKey)
  const size = endOffset - startOffset + 1

  return new Set(
    Array.from({ length: size }).map((_, index) => {
      return formatDateKey(addDays(anchor, startOffset + index))
    }),
  )
}
