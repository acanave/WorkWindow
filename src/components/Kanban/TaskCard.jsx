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
      className={`rounded-md border bg-white px-3 shadow-sm transition-all duration-200 ${
        expanded
          ? 'border-slate-400 py-3 ring-1 ring-slate-200'
          : 'cursor-pointer border-slate-300 py-2 hover:border-slate-400'
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${card.title}`}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h4 className="text-sm font-semibold text-slate-900">{card.title}</h4>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{expanded ? 'Hide' : 'Open'}</span>
      </button>

      {expanded && (
        <>
          <div className="mt-3 flex flex-wrap gap-1">
            {risk && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  risk.kind === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'
                }`}
                title={`Due ${risk.dueDate} - ${risk.remainingPoints} pts left - ${risk.plannedBeforeDue} pts planned`}
              >
                {risk.kind === 'overdue' ? 'Overdue' : `Short ${risk.shortfall}pt`}
              </span>
            )}
            {unresolvedDependencyCount > 0 && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Depends on {unresolvedDependencyCount}
              </span>
            )}
            {hasDependencyCycle && (
              <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">Cycle</span>
            )}
            {!hasDependencyCycle && chainDepth > 1 && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                Chain {chainDepth} deep
              </span>
            )}
          </div>

          <div className="mt-3 space-y-1 text-xs text-slate-600">
            <p>
              {card.completed_points}/{card.estimate_points} pts complete ({completion}%)
            </p>
            <p>{totalPlanned} pts planned</p>
            {card.due_date && <p>Due {card.due_date}</p>}
            {card.description && <p className="text-slate-700">{card.description}</p>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpen()
              }}
              className="rounded border border-slate-900 bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onLogProgress(card.id, -1)
              }}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              -1
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onLogProgress(card.id, 1)
              }}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              +1
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onPlanSelectedDate(card.id)
              }}
              className="rounded border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-900 hover:bg-cyan-100"
            >
              Plan to {selectedDate}
            </button>
            <label className="sr-only" htmlFor={`status-${card.id}`}>
              Move {card.title}
            </label>
            <select
              id={`status-${card.id}`}
              value={card.status}
              onChange={handleStatusChange}
              onClick={(event) => event.stopPropagation()}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
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
    </article>
  )
}
