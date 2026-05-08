export default function TaskCard({
  card,
  selectedDate,
  risk,
  unresolvedDependencyCount,
  chainDepth,
  hasDependencyCycle,
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
      onClick={onOpen}
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getCardTone(card.status)}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-950">{card.title}</h4>
        <div className="flex flex-col items-end gap-1">
          {card.due_date && card.planned_day_blocks.length > 0 && (
            <span className="rounded bg-blue-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">Anchor</span>
          )}
          {risk && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                risk.kind === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'
              }`}
              title={`Due ${risk.dueDate} • ${risk.remainingPoints} pts left • ${risk.plannedBeforeDue} pts planned`}
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
      </div>

      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <span>{card.due_date ? `Due ${card.due_date}` : 'No anchor date'}</span>
          <span className="font-bold text-slate-800">{totalPlanned}pt</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${completion}%` }} />
        </div>
        <p>
          {card.completed_points}/{card.estimate_points} pts complete
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <button
          onClick={() => onLogProgress(card.id, -1)}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          -1
        </button>
        <button
          onClick={() => onLogProgress(card.id, 1)}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          +1
        </button>
        <button
          onClick={() => onPlanSelectedDate(card.id)}
          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          Add window {selectedDate}
        </button>
        <label className="sr-only" htmlFor={`status-${card.id}`}>
          Move {card.title}
        </label>
        <select
          id={`status-${card.id}`}
          value={card.status}
          onChange={handleStatusChange}
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
    </article>
  )
}

function getCardTone(status) {
  if (status === 'In Progress') return 'border-blue-300'
  if (status === 'Blocked') return 'border-fuchsia-200 bg-fuchsia-50/50'
  if (status === 'Done') return 'border-emerald-200 bg-emerald-50/50'
  return 'border-slate-200'
}
