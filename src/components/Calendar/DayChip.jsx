import { useState } from 'react'

export default function DayChip({ block, cardTitle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [points, setPoints] = useState(block.points)

  const save = () => {
    onUpdate(block.cardId, block.id, points)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded border border-slate-300 bg-white p-1 text-xs shadow">
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
      onClick={() => setEditing(true)}
      className="w-full truncate rounded bg-slate-900 px-1.5 py-1 text-left text-[11px] text-white hover:bg-slate-700"
      title={`${cardTitle} • ${block.points}pt`}
    >
      {cardTitle} • {block.points}pt
    </button>
  )
}
