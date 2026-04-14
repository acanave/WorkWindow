import { useState } from 'react'
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
  const [expandedCardId, setExpandedCardId] = useState(null)

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const cardId = event.dataTransfer.getData('application/workwindow-card-id')
    if (!cardId) return
    onMoveCard(cardId, status)
  }

  const toggleExpandedCard = (cardId) => {
    setExpandedCardId((current) => (current === cardId ? null : cardId))
  }

  return (
    <section
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-[300px] rounded-lg border border-slate-200 bg-slate-100 p-3"
    >
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">{status}</h3>
      <div className="pb-2">
        {cards.map((card, index) => {
          const expanded = expandedCardId === card.id

          return (
            <div
              key={card.id}
              className={`${index === 0 ? '' : expanded ? 'mt-2' : '-mt-6'} relative transition-all duration-200`}
              style={{ zIndex: expanded ? cards.length + 1 : cards.length - index }}
            >
              <TaskCard
                card={card}
                expanded={expanded}
                selectedDate={selectedDate}
                unresolvedDependencyCount={unresolvedMap[card.id] || 0}
                chainDepth={chainDepthByCardId[card.id] || 0}
                hasDependencyCycle={hasCycleByCardId[card.id] || false}
                risk={riskByCardId[card.id] || null}
                onToggleExpand={() => toggleExpandedCard(card.id)}
                onOpen={() => onOpenCard(card.id)}
                onMoveCard={onMoveCard}
                onLogProgress={onLogProgress}
                onPlanSelectedDate={onPlanCardToSelectedDate}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
