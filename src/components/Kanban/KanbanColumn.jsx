import TaskCard from './TaskCard'

export default function KanbanColumn({
  status,
  cards,
  unresolvedMap,
  riskByCardId,
  onOpenCard,
  onMoveCard,
  onLogProgress,
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
      className="min-h-[300px] rounded-lg border border-slate-200 bg-slate-100 p-3"
    >
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">{status}</h3>
      <div className="space-y-2">
        {cards.map((card) => (
          <TaskCard
            key={card.id}
            card={card}
            unresolvedDependencyCount={unresolvedMap[card.id] || 0}
            risk={riskByCardId[card.id] || null}
            onOpen={() => onOpenCard(card.id)}
            onLogProgress={onLogProgress}
          />
        ))}
      </div>
    </section>
  )
}
