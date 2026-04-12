import { useMemo, useState } from 'react'
import { STATUSES } from '../../state/schema'
import NewCardForm from './NewCardForm'
import KanbanColumn from './KanbanColumn'

export default function KanbanBoard({
  cards,
  selectedDate,
  unresolvedMap,
  chainDepthByCardId = {},
  hasCycleByCardId = {},
  riskByCardId = {},
  onCreateCard,
  onOpenCard,
  onMoveCard,
  onLogProgress,
  onPlanCardToSelectedDate,
}) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('manual')
  const [visibleStatuses, setVisibleStatuses] = useState(STATUSES)

  const filteredCards = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return cards.filter((card) => {
      if (!visibleStatuses.includes(card.status)) return false
      if (!needle) return true
      const haystack = `${card.title} ${card.description}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [cards, query, visibleStatuses])

  const sortedCards = useMemo(() => sortCards(filteredCards, sortBy), [filteredCards, sortBy])

  const statusesToRender = STATUSES.filter((status) => visibleStatuses.includes(status))

  const toggleStatus = (status) => {
    setVisibleStatuses((current) => {
      if (current.includes(status)) {
        if (current.length === 1) return current
        return current.filter((value) => value !== status)
      }
      const next = new Set(current)
      next.add(status)
      return STATUSES.filter((value) => next.has(value))
    })
  }

  return (
    <div>
      <NewCardForm onSubmit={onCreateCard} />
      <div className="mb-3 space-y-2 rounded-md border border-slate-200 bg-white p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or description..."
            aria-label="Search cards"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort cards"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="manual">Sort: Created order</option>
            <option value="due_asc">Sort: Due date (earliest first)</option>
            <option value="due_desc">Sort: Due date (latest first)</option>
            <option value="progress_desc">Sort: Progress (highest first)</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((status) => {
            const active = visibleStatuses.includes(status)
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`rounded border px-2 py-1 text-xs ${
                  active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {status}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-500">
          Touch fallback: use each card&apos;s status menu or plan it directly to the selected day ({selectedDate}).
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {statusesToRender.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={sortedCards.filter((card) => card.status === status)}
            selectedDate={selectedDate}
            unresolvedMap={unresolvedMap}
            chainDepthByCardId={chainDepthByCardId}
            hasCycleByCardId={hasCycleByCardId}
            riskByCardId={riskByCardId}
            onOpenCard={onOpenCard}
            onMoveCard={onMoveCard}
            onLogProgress={onLogProgress}
            onPlanCardToSelectedDate={onPlanCardToSelectedDate}
          />
        ))}
      </div>
    </div>
  )
}

function sortCards(cards, sortBy) {
  if (sortBy === 'manual') return cards

  const next = [...cards]

  if (sortBy === 'due_asc' || sortBy === 'due_desc') {
    const direction = sortBy === 'due_asc' ? 1 : -1
    return next.sort((a, b) => {
      const dueA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
      const dueB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY
      return (dueA - dueB) * direction
    })
  }

  if (sortBy === 'progress_desc') {
    return next.sort((a, b) => {
      const progressA = a.completed_points / a.estimate_points
      const progressB = b.completed_points / b.estimate_points
      return progressB - progressA
    })
  }

  return cards
}
