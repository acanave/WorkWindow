import TaskCard from './TaskCard'

export default function KanbanColumn({
  status,
  cards,
  selectedDate,
  unresolvedMap,
  chainDepthByCardId,
  hasCycleByCardId,
  riskByCardId,
  onOpenCard,
  onMoveCard,
  onLogProgress,
  onPlanCardToSelectedDate,
}) {
  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const cardId = event.dataTransfer.getData('application/workwindow-card-id')
    if (!cardId) return
    onMoveCard(cardId, status)
  }

  return (
    <section
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="border-b border-slate-200 px-4 py-4 last:border-b-0"
    >
      <div className="mb-4 flex items-center gap-4">
        <span className={`h-3.5 w-3.5 rounded-full ${getStatusDot(status)}`} />
        <h3 className={`text-base font-bold ${getStatusText(status)}`}>{status}</h3>
        <span className="text-sm text-slate-500">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1 text-sm text-slate-500">{sumCards(cards)}pt</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => (
          <TaskCard
            key={card.id}
            card={card}
            selectedDate={selectedDate}
            unresolvedDependencyCount={unresolvedMap[card.id] || 0}
            chainDepth={chainDepthByCardId[card.id] || 0}
            hasDependencyCycle={hasCycleByCardId[card.id] || false}
            risk={riskByCardId[card.id] || null}
            onOpen={() => onOpenCard(card.id)}
            onMoveCard={onMoveCard}
            onLogProgress={onLogProgress}
            onPlanSelectedDate={onPlanCardToSelectedDate}
          />
        ))}
        {cards.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Move cards here to change status.
          </div>
        )}
      </div>
    </section>
  )
}

function sumCards(cards) {
  return cards.reduce((sum, card) => {
    return sum + card.planned_day_blocks.reduce((blockSum, block) => blockSum + block.points, 0)
  }, 0)
}

function getStatusDot(status) {
  if (status === 'In Progress') return 'bg-blue-600'
  if (status === 'Blocked') return 'bg-fuchsia-500'
  if (status === 'Done') return 'bg-emerald-500'
  return 'bg-slate-300'
}

function getStatusText(status) {
  if (status === 'In Progress') return 'text-blue-700'
  if (status === 'Blocked') return 'text-fuchsia-700'
  if (status === 'Done') return 'text-emerald-700'
  return 'text-slate-700'
}
