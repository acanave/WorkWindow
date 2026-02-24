import { STATUSES } from '../../state/schema'
import NewCardForm from './NewCardForm'
import KanbanColumn from './KanbanColumn'

export default function KanbanBoard({
  cards,
  unresolvedMap,
  onCreateCard,
  onOpenCard,
  onMoveCard,
  onLogProgress,
}) {
  return (
    <div>
      <NewCardForm onSubmit={onCreateCard} />
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={cards.filter((card) => card.status === status)}
            unresolvedMap={unresolvedMap}
            onOpenCard={onOpenCard}
            onMoveCard={onMoveCard}
            onLogProgress={onLogProgress}
          />
        ))}
      </div>
    </div>
  )
}
