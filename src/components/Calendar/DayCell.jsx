export default function DayCell({
  day,
  selected,
  inDragRange = false,
  anchors = [],
  cardMetaById,
  onSelect,
  onStartRange,
  onExtendRange,
  onFinishRange,
  onDropCard,
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
      onMouseDown={(event) => {
        if (event.button !== 0) return
        onStartRange?.(day.dateKey)
      }}
      onMouseEnter={() => onExtendRange?.(day.dateKey)}
      onMouseUp={() => onFinishRange?.(day.dateKey)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`min-h-[124px] border-b border-r border-[color:var(--ww-border-soft)] p-3 text-left align-top transition ${
        selected
          ? 'relative z-10 -m-px border-2 border-[color:var(--ww-accent-border)] bg-[color:var(--ww-accent-soft)] shadow-sm'
          : 'bg-[color:var(--ww-panel-bg)] hover:bg-[color:var(--ww-soft-panel-bg)]'
      } ${
        inDragRange ? 'bg-[color:var(--ww-accent-soft)] ring-2 ring-inset ring-[color:var(--ww-accent-border)]' : ''
      } ${day.inCurrentMonth ? '' : 'bg-[color:var(--ww-soft-panel-bg)] text-[color:var(--ww-muted)] opacity-60'}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
            selected
              ? 'bg-[color:var(--ww-panel-bg)] text-[color:var(--ww-accent)] ring-1 ring-[color:var(--ww-accent-border)]'
              : 'text-[color:var(--ww-muted)]'
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
      </div>
    </div>
  )
}

function AnchorChip({ anchor, cardTitle }) {
  return (
    <div
      className={`w-full truncate rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${
        anchor.accent?.anchor ||
        'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100'
      }`}
      title={`Anchor: ${cardTitle}`}
    >
      <span className="mr-1 rounded bg-white/70 px-1 text-[10px] uppercase dark:bg-white/10">Anchor</span>
      {cardTitle}
    </div>
  )
}
