function clampPercent(value) {
  return Math.max(0, Math.min(100, value))
}

export default function PerformancePanel({ snapshot }) {
  const burnupPct = clampPercent(snapshot.burnupPct)
  const coveragePct = clampPercent(snapshot.planCoveragePct)
  const projected = snapshot.burndown.projectedRemainingIn7d
  const coverageValue =
    snapshot.totals.remaining === 0
      ? 'All work completed'
      : `${snapshot.totals.planned}/${snapshot.totals.remaining} pts`

  return (
    <section className="rounded-lg border border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[color:var(--ww-heading)]">Performance</h2>
        <span className="text-xs text-[color:var(--ww-muted)]">Burnup and velocity snapshot</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Burnup"
          value={`${snapshot.totals.completed}/${snapshot.totals.estimate} pts`}
          detail={`${burnupPct}% complete`}
          percent={burnupPct}
          tone="slate"
        />
        <MetricTile
          label="Plan coverage"
          value={coverageValue}
          detail={`${coveragePct}% of remaining work planned`}
          percent={coveragePct}
          tone="blue"
        />
        <MetricTile
          label="Velocity (7d)"
          value={`${snapshot.velocity.completedLast7d} pts`}
          detail={`Completed in last 7 days`}
          percent={Math.min(100, snapshot.velocity.completedLast7d * 10)}
          tone="green"
        />
        <MetricTile
          label="Forecast (7d)"
          value={`${projected} pts`}
          detail="Remaining if current plan is executed"
          percent={
            snapshot.totals.remaining === 0 ? 100 : clampPercent(100 - (projected / snapshot.totals.remaining) * 100)
          }
          tone="amber"
        />
      </div>
    </section>
  )
}

function MetricTile({ label, value, detail, percent, tone }) {
  const styles = {
    slate: 'bg-slate-900',
    blue: 'bg-blue-600',
    green: 'bg-emerald-600',
    amber: 'bg-amber-500',
  }

  return (
    <article className="rounded border border-[color:var(--ww-border-soft)] bg-[color:var(--ww-soft-panel-bg)] p-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ww-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[color:var(--ww-heading)]">{value}</p>
      <p className="text-xs text-[color:var(--ww-muted)]">{detail}</p>
      <div className="mt-2 h-1.5 rounded bg-[color:var(--ww-panel-bg)]">
        <div className={`h-1.5 rounded ${styles[tone]}`} style={{ width: `${clampPercent(percent)}%` }} />
      </div>
    </article>
  )
}
