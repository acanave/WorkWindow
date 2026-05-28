export default function TaskCard({
  card,
  expanded = false,
  selectedDate,
  risk,
  unresolvedDependencyCount,
  chainDepth,
  hasDependencyCycle,
  onToggleExpand,
  onOpen,
  onMoveCard,
  onLogProgress,
  onPlanSelectedDate,
}) {
  const completion = Math.round((card.completed_points / card.estimate_points) * 100)
  const totalPlanned = card.planned_day_blocks.reduce((sum, block) => sum + block.points, 0)
  const canMoveToDone = card.completed_points >= card.estimate_points

  const handleDragStart = (event) => {
    event.dataTransfer.setData('application/workwindow-card-id', card.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleStatusChange = (event) => {
    onMoveCard(card.id, event.target.value)
  }

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      className={`rounded-lg border bg-[color:var(--ww-panel-bg)] px-3 shadow-sm transition-all duration-200 ${
        expanded
          ? `${getCardTone(card.status)} py-3 ring-1 ring-[color:var(--ww-border-soft)]`
          : `${getCardTone(card.status)} py-2 hover:bg-[color:var(--ww-soft-panel-bg)]`
      } ${expanded ? '' : 'cursor-pointer'}`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${card.title}`}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h4 className="text-sm font-semibold text-[color:var(--ww-heading)]">{card.title}</h4>
        <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--ww-muted)]">
          {expanded ? 'Hide' : 'Open'}
        </span>
      </button>

      {expanded && (
        <>
          <div className="mt-3 flex flex-wrap gap-1">
            {card.due_date && card.planned_day_blocks.length > 0 && (
              <span className="rounded border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100">
                Anchor
              </span>
            )}
            {risk && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  risk.kind === 'overdue'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200'
                }`}
                title={`Due ${risk.dueDate} • ${risk.remainingPoints} pts left • ${risk.plannedBeforeDue} pts planned`}
              >
                {risk.kind === 'overdue' ? 'Overdue' : `Short ${risk.shortfall}pt`}
              </span>
            )}
            {unresolvedDependencyCount > 0 && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                Depends on {unresolvedDependencyCount}
              </span>
            )}
            {hasDependencyCycle && (
              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
                Cycle
              </span>
            )}
            {!hasDependencyCycle && chainDepth > 1 && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                Chain {chainDepth} deep
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2 text-xs text-[color:var(--ww-muted)]">
            <div className="flex items-center justify-between gap-2">
              <span>{card.due_date ? `Due ${card.due_date}` : 'No anchor date'}</span>
              <span className="font-semibold text-[color:var(--ww-text)]">{totalPlanned}pt</span>
            </div>
            <div className="h-1.5 rounded-full bg-[color:var(--ww-soft-panel-bg)]">
              <div className="h-1.5 rounded-full bg-blue-300" style={{ width: `${completion}%` }} />
            </div>
            <p>
              {card.completed_points}/{card.estimate_points} pts complete
            </p>
            {card.description && <p className="text-[color:var(--ww-text)]">{card.description}</p>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpen()
              }}
              className="ww-button px-2 py-1 text-xs"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onLogProgress(card.id, -1)
              }}
              className="ww-button px-2 py-1 text-xs"
            >
              -1
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onLogProgress(card.id, 1)
              }}
              className="ww-button px-2 py-1 text-xs"
            >
              +1
            </button>
            <label className="sr-only" htmlFor={`status-${card.id}`}>
              Move {card.title}
            </label>
            <select
              id={`status-${card.id}`}
              value={card.status}
              onChange={handleStatusChange}
              onClick={(event) => event.stopPropagation()}
              className="ww-input px-2 py-1 text-xs"
            >
              <option value="Backlog">Backlog</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Done" disabled={!canMoveToDone}>
                Done
              </option>
            </select>
          </div>
        </>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onPlanSelectedDate(card.id)
          }}
          className="rounded border border-[color:var(--ww-accent-border)] bg-[color:var(--ww-action-bg)] px-2 py-1 text-xs font-medium text-[color:var(--ww-accent)] hover:bg-[color:var(--ww-action-hover)]"
        >
          Add window {selectedDate}
        </button>
      </div>
    </article>
  )
}

function getCardTone(status) {
  if (status === 'In Progress') return 'border-blue-200 bg-blue-50/40 dark:border-blue-800/80 dark:bg-blue-950/20'
  if (status === 'Blocked')
    return 'border-fuchsia-200 bg-fuchsia-50/50 dark:border-fuchsia-800/80 dark:bg-fuchsia-950/20'
  if (status === 'Done') return 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/80 dark:bg-emerald-950/20'
  return 'border-[color:var(--ww-border-soft)]'
}
