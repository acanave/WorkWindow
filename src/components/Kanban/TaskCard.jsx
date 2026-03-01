export default function TaskCard({ card, risk, unresolvedDependencyCount, onOpen, onLogProgress }) {
  const completion = Math.round((card.completed_points / card.estimate_points) * 100)
  const totalPlanned = card.planned_day_blocks.reduce((sum, block) => sum + block.points, 0)

  const handleDragStart = (event) => {
    event.dataTransfer.setData('application/workwindow-card-id', card.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      onClick={onOpen}
      className="cursor-pointer rounded-md border border-slate-300 bg-white p-3 shadow-sm hover:border-slate-400"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{card.title}</h4>
        <div className="flex flex-col items-end gap-1">
          {risk && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                risk.kind === 'overdue'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-orange-100 text-orange-800'
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
        </div>
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        <p>
          {card.completed_points}/{card.estimate_points} pts complete ({completion}%)
        </p>
        <p>{totalPlanned} pts planned</p>
        {card.due_date && <p>Due {card.due_date}</p>}
      </div>

      <div className="mt-3 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
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
      </div>
    </article>
  )
}
