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
      className="border-b border-[color:var(--ww-border-soft)] px-4 py-4 last:border-b-0"
    >
      <div className="mb-4 flex items-center gap-4">
        <span className={`h-3.5 w-3.5 rounded-full ${getStatusDot(status)}`} />
        <h3 className={`text-base font-semibold ${getStatusText(status)}`}>{status}</h3>
        <span className="text-sm text-[color:var(--ww-muted)]">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1 text-sm text-[color:var(--ww-muted)]">{sumCards(cards)}pt</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => {
          const expanded = expandedCardId === card.id

          return (
            <TaskCard
              key={card.id}
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
          )
        })}
        {cards.length === 0 && (
          <div className="rounded-xl border border-dashed border-[color:var(--ww-border)] bg-[color:var(--ww-soft-panel-bg)] px-4 py-8 text-center text-sm text-[color:var(--ww-muted)]">
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
  if (status === 'In Progress') return 'bg-blue-300'
  if (status === 'Blocked') return 'bg-fuchsia-300'
  if (status === 'Done') return 'bg-emerald-300'
  return 'bg-slate-300'
}

function getStatusText(status) {
  if (status === 'In Progress') return 'text-blue-800 dark:text-blue-300'
  if (status === 'Blocked') return 'text-fuchsia-800 dark:text-fuchsia-300'
  if (status === 'Done') return 'text-emerald-800 dark:text-emerald-300'
  return 'text-[color:var(--ww-heading)]'
}
