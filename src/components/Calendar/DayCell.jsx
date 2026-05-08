import DayChip from './DayChip'

export default function DayCell({
  day,
  selected,
  anchors = [],
  workWindows = [],
  cardMetaById,
  onSelect,
  onDropCard,
  onUpdateBlock,
  onDeleteBlock,
}) {
  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const cardId = event.dataTransfer.getData('application/workwindow-card-id')
    if (!cardId) return
    onDropCard(cardId, day.dateKey)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(day.dateKey)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(day.dateKey)
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`min-h-[124px] border-b border-r border-slate-200 p-3 text-left align-top transition ${
        selected ? 'relative z-10 -m-px border-2 border-blue-600 bg-blue-50/40 shadow-sm' : 'bg-white hover:bg-slate-50'
      } ${day.inCurrentMonth ? '' : 'bg-slate-50/60 text-slate-400'}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
            selected ? 'bg-blue-600 text-white' : 'text-slate-700'
          }`}
        >
          {day.date.getDate()}
        </span>
      </div>
      <div className="space-y-1">
        {anchors.map((anchor) => {
          const meta = cardMetaById[anchor.cardId] || {}
          return <AnchorChip key={anchor.id} anchor={anchor} cardTitle={meta.title || 'Untitled'} />
        })}
        {workWindows.map((chip) => (
          <DayChip
            key={chip.id}
            block={chip}
            cardTitle={cardMetaById[chip.cardId]?.title || 'Untitled'}
            accent={chip.accent}
            onUpdate={onUpdateBlock}
            onDelete={onDeleteBlock}
          />
        ))}
      </div>
    </div>
  )
}

function AnchorChip({ anchor, cardTitle }) {
  return (
    <div
      className={`w-full truncate rounded-lg border px-2 py-2 text-center text-[11px] font-bold ${
        anchor.accent?.anchor || 'border-slate-900 bg-slate-900 text-white'
      }`}
      title={`Anchor: ${cardTitle}`}
    >
      <span className="mr-1 rounded bg-white/20 px-1 text-[10px] uppercase">Anchor</span>
      {cardTitle}
    </div>
  )
}
