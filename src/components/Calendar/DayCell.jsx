import DayChip from './DayChip'

export default function DayCell({
  day,
  selected,
  chips,
  cardTitleById,
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
      onClick={() => onSelect(day.dateKey)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`min-h-[112px] rounded border p-2 ${
        selected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
      } ${day.inCurrentMonth ? '' : 'opacity-50'}`}
    >
      <div className="mb-2 text-xs font-semibold text-slate-700">{day.date.getDate()}</div>
      <div className="space-y-1">
        {chips.map((chip) => (
          <DayChip
            key={chip.id}
            block={chip}
            cardTitle={cardTitleById[chip.cardId] || 'Untitled'}
            onUpdate={onUpdateBlock}
            onDelete={onDeleteBlock}
          />
        ))}
      </div>
    </div>
  )
}
