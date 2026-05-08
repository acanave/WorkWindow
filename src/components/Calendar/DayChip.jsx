import { useEffect, useState } from 'react'

export default function DayChip({ block, cardTitle, accent, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [points, setPoints] = useState(block.points)

  useEffect(() => {
    setPoints(block.points)
  }, [block.id, block.points])

  const save = () => {
    onUpdate(block.cardId, block.id, points)
    setEditing(false)
  }

  if (editing) {
    return (
      <div
        onClick={(event) => event.stopPropagation()}
        className={`rounded border border-l-4 border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-1 text-xs shadow-sm ${
          accent?.agenda || 'border-l-slate-500'
        }`}
      >
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={8}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            className="ww-input w-12 px-1 py-0.5"
          />
          <button
            onClick={save}
            className="rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100"
          >
            Save
          </button>
          <button
            onClick={() => onDelete(block.cardId, block.id)}
            className="rounded border border-[color:var(--ww-border)] px-1.5 py-0.5 text-[color:var(--ww-muted)]"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={(event) => {
        event.stopPropagation()
        setEditing(true)
      }}
      className={`w-full truncate rounded-lg border border-l-4 px-2 py-2 text-left text-[11px] font-medium ${
        accent?.workWindow ||
        'border-l-blue-400 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100 dark:hover:bg-blue-900/60'
      }`}
      title={`Work window: ${cardTitle} • ${block.points}pt`}
    >
      <span className="mr-1 text-[10px] uppercase opacity-75">Window</span>
      {cardTitle} • {block.points}pt
    </button>
  )
}
