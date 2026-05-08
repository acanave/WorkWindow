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
        className={`rounded border border-l-4 border-slate-300 bg-white p-1 text-xs shadow ${
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
            className="w-12 rounded border border-slate-300 px-1 py-0.5"
          />
          <button onClick={save} className="rounded bg-slate-900 px-1.5 py-0.5 text-white">
            Save
          </button>
          <button
            onClick={() => onDelete(block.cardId, block.id)}
            className="rounded border border-slate-300 px-1.5 py-0.5"
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
        accent?.workWindow || 'border-l-slate-900 bg-slate-900 text-white hover:bg-slate-700'
      }`}
      title={`Work window: ${cardTitle} • ${block.points}pt`}
    >
      <span className="mr-1 text-[10px] uppercase opacity-75">Window</span>
      {cardTitle} • {block.points}pt
    </button>
  )
}
