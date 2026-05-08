import DayChip from './DayChip'

export default function AgendaStrip({
  selectedDate,
  anchors = [],
  blocks,
  cardMetaById,
  riskByCardId = {},
  onUpdateBlock,
  onDeleteBlock,
}) {
  const totalPoints = blocks.reduce((sum, block) => sum + block.points, 0)
  const primaryAnchor = anchors[0] || null
  const primaryAnchorMeta = primaryAnchor ? cardMetaById[primaryAnchor.cardId] || {} : null
  const primaryRisk = primaryAnchor ? riskByCardId[primaryAnchor.cardId] || null : null
  const breakdown = buildFootprintBreakdown(totalPoints)

  return (
    <aside className="ww-card p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ww-muted)]">Task inspector</p>
          <h3 className="mt-1 text-lg font-semibold text-[color:var(--ww-heading)]">{selectedDate}</h3>
        </div>
        {primaryRisk && (
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
              primaryRisk.kind === 'overdue'
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900'
                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900'
            }`}
          >
            {primaryRisk.kind === 'overdue' ? 'Overdue' : `Short ${primaryRisk.shortfall}pt`}
          </span>
        )}
      </div>

      {primaryAnchor ? (
        <div className="mb-5 rounded-2xl border border-[color:var(--ww-accent-border)] p-4 [background:var(--ww-accent-soft)]">
          <div className="mb-3 inline-flex rounded-full border border-[color:var(--ww-accent-border)] bg-[color:var(--ww-panel-bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--ww-accent)]">
            Anchor
          </div>
          <p className="text-xl font-semibold leading-tight text-[color:var(--ww-heading)]">
            {primaryAnchorMeta.title || 'Untitled'}
          </p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[color:var(--ww-muted)]">Deadline</span>
            <span className="font-medium text-[color:var(--ww-text)]">{primaryAnchor.date}</span>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-dashed border-[color:var(--ww-border)] p-4 text-sm text-[color:var(--ww-muted)]">
          No anchor task on this date. Drag across the calendar to create a new WorkWindow, or set an anchor due date in
          a work item.
        </div>
      )}

      {anchors.length > 1 && (
        <div className="mb-5 space-y-2">
          {anchors.slice(1).map((anchor) => {
            const meta = cardMetaById[anchor.cardId] || {}
            return (
              <div
                key={anchor.id}
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  anchor.accent?.anchor ||
                  'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100'
                }`}
              >
                Anchor: {meta.title || 'Untitled'}
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-[color:var(--ww-border-soft)] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[color:var(--ww-heading)]">WorkWindow breakdown</h4>
          <span className="text-sm font-semibold text-[color:var(--ww-accent)]">
            {blocks.length} item{blocks.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-2.5">
          {anchors.length === 0 && blocks.length === 0 && (
            <p className="rounded-xl bg-[color:var(--ww-soft-panel-bg)] p-3 text-sm text-[color:var(--ww-muted)]">
              No supporting time footprint scheduled for this day.
            </p>
          )}
          {totalPoints > 0 &&
            breakdown.map((item) => (
              <FootprintRow
                key={item.label}
                label={item.label}
                detail={item.detail}
                value={item.value}
                tone={item.tone}
              />
            ))}
          {blocks.map((block) => {
            const meta = cardMetaById[block.cardId] || {}
            return (
              <div key={block.id}>
                <DayChip
                  block={block}
                  cardTitle={meta.title || 'Untitled'}
                  accent={block.accent}
                  onUpdate={onUpdateBlock}
                  onDelete={onDeleteBlock}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[color:var(--ww-border-soft)] p-4 [background:var(--ww-soft-panel-bg)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ww-muted)]">
              True time footprint
            </p>
            <p className="mt-1 text-sm text-[color:var(--ww-muted)]">
              {Math.max(0.5, totalPoints / 8).toFixed(1)} days of real work
            </p>
          </div>
          <p className="text-2xl font-semibold text-[color:var(--ww-heading)]">{totalPoints}pt</p>
        </div>
      </div>
    </aside>
  )
}

function FootprintRow({ label, detail, value, tone }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[color:var(--ww-border-soft)] bg-[color:var(--ww-panel-bg)] px-3 py-2">
      <div className="flex items-center gap-3">
        <span className={`h-8 w-8 rounded-lg ${tone}`} />
        <div>
          <p className="text-sm font-medium text-[color:var(--ww-heading)]">{label}</p>
          <p className="text-xs text-[color:var(--ww-muted)]">{detail}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-[color:var(--ww-text)]">{value}pt</span>
    </div>
  )
}

function buildFootprintBreakdown(totalPoints) {
  if (totalPoints <= 0) {
    return [
      { label: 'Prep', detail: 'No time planned', value: 0, tone: 'bg-blue-100 dark:bg-blue-900/60' },
      { label: 'Focus', detail: 'No time planned', value: 0, tone: 'bg-violet-100 dark:bg-violet-900/60' },
      { label: 'Setup', detail: 'No time planned', value: 0, tone: 'bg-fuchsia-100 dark:bg-fuchsia-900/60' },
      { label: 'Travel', detail: 'No time planned', value: 0, tone: 'bg-cyan-100 dark:bg-cyan-900/60' },
      { label: 'Buffer', detail: 'No time planned', value: 0, tone: 'bg-slate-100 dark:bg-slate-700' },
    ]
  }

  const focus = Math.max(1, Math.ceil(totalPoints * 0.45))
  const prep = Math.max(0, Math.floor(totalPoints * 0.2))
  const setup = Math.max(0, Math.floor(totalPoints * 0.15))
  const travel = Math.max(0, Math.floor(totalPoints * 0.1))
  const buffer = Math.max(0, totalPoints - focus - prep - setup - travel)

  return [
    { label: 'Prep', detail: 'Planning and materials', value: prep, tone: 'bg-blue-100 dark:bg-blue-900/60' },
    { label: 'Focus', detail: 'Deep execution block', value: focus, tone: 'bg-violet-100 dark:bg-violet-900/60' },
    { label: 'Setup', detail: 'Tools and environment', value: setup, tone: 'bg-fuchsia-100 dark:bg-fuchsia-900/60' },
    { label: 'Travel', detail: 'Movement and logistics', value: travel, tone: 'bg-cyan-100 dark:bg-cyan-900/60' },
    { label: 'Buffer', detail: 'Slack before deadline', value: buffer, tone: 'bg-slate-100 dark:bg-slate-700' },
  ]
}
