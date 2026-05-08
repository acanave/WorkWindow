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
  performanceSnapshot,
  dependencyInsights,
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_254px]">
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title or description..."
              aria-label="Search cards"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                Filter
              </button>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                aria-label="Sprint window"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                <option value="manual">Sprint: Created order</option>
                <option value="due_asc">Sort: Due date (earliest first)</option>
                <option value="due_desc">Sort: Due date (latest first)</option>
                <option value="progress_desc">Sort: Progress (highest first)</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort cards"
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
            >
              <option value="manual">Sort</option>
              <option value="due_asc">Due date</option>
              <option value="due_desc">Latest due</option>
              <option value="progress_desc">Progress</option>
            </select>
            <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              Group
            </button>
            <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              View
            </button>
            <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              ...
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4 py-3">
          {STATUSES.map((status) => {
            const active = visibleStatuses.includes(status)
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  active ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            )
          })}
        </div>

        <div>
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

        <CardLegend cards={cards} />
      </section>

      <CardsSidePanel
        cards={cards}
        selectedDate={selectedDate}
        snapshot={performanceSnapshot}
        dependencyInsights={dependencyInsights}
        onCreateCard={onCreateCard}
        onOpenCard={onOpenCard}
      />
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

function CardsSidePanel({ cards, selectedDate, snapshot, dependencyInsights, onCreateCard, onOpenCard }) {
  const blocked = cards.filter((card) => card.status === 'Blocked').length
  const inProgress = cards.filter((card) => card.status === 'In Progress').length
  const done = cards.filter((card) => card.status === 'Done').length
  const estimate = snapshot?.totals.estimate || cards.reduce((sum, card) => sum + card.estimate_points, 0)
  const planned = snapshot?.totals.planned || cards.reduce((sum, card) => sum + card.planned_day_blocks.length, 0)
  const progressPct = estimate === 0 ? 0 : Math.round(((snapshot?.totals.completed || 0) / estimate) * 100)
  const cycleCount = Object.values(dependencyInsights?.hasCycleByCardId || {}).filter(Boolean).length
  const blockedCards = cards.filter((card) => (dependencyInsights?.unresolvedCountByCardId?.[card.id] || 0) > 0)

  return (
    <aside className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-slate-950">Sprint Progress</h3>
        <p className="mt-1 text-sm text-slate-500">Selected day {selectedDate}</p>
        <div className="mt-5 flex items-center gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-emerald-500 text-lg font-bold text-slate-800"
            style={{ borderLeftColor: '#e2e8f0' }}
          >
            {progressPct}%
          </div>
          <div>
            <p className="text-xl font-bold text-slate-950">
              {planned} / {estimate}pt
            </p>
            <p className="text-sm text-slate-500">planned effort</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="done" value={done} />
          <MiniStat label="in progress" value={inProgress} />
          <MiniStat label="blocked" value={blocked} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-slate-950">Workload Summary</h3>
        <div className="mt-4 space-y-3 text-sm">
          <SummaryRow color="bg-slate-400" label="Backlog" value={sumStatus(cards, 'Backlog')} />
          <SummaryRow color="bg-blue-600" label="In Progress" value={sumStatus(cards, 'In Progress')} />
          <SummaryRow color="bg-fuchsia-500" label="Blocked" value={sumStatus(cards, 'Blocked')} />
          <SummaryRow color="bg-emerald-500" label="Completed" value={sumStatus(cards, 'Done')} />
        </div>
        {cycleCount > 0 && <p className="mt-4 text-xs font-medium text-rose-600">{cycleCount} dependency cycle risk</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-slate-950">Dependencies</h3>
        <div className="mt-3 space-y-2">
          {blockedCards.length === 0 && <p className="text-sm text-slate-500">No unresolved blockers.</p>}
          {blockedCards.slice(0, 4).map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenCard(card.id)}
              className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900"
            >
              <span className="font-semibold">{card.title}</span>
              <span className="ml-2 text-xs">{dependencyInsights.unresolvedCountByCardId[card.id]} blocker(s)</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-bold text-slate-950">Quick Actions</h3>
        <div className="mt-3">
          <NewCardForm onSubmit={onCreateCard} compact />
        </div>
      </section>
    </aside>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-950">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function SummaryRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600">
        <span className={`h-4 w-1.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-bold text-slate-950">{value}pt</span>
    </div>
  )
}

function CardLegend({ cards }) {
  const total = cards.reduce((sum, card) => {
    return sum + card.planned_day_blocks.reduce((blockSum, block) => blockSum + block.points, 0)
  }, 0)

  return (
    <div className="flex flex-wrap items-center gap-6 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
      <span className="font-medium text-blue-700">Travel</span>
      <span className="font-medium text-blue-700">Prep</span>
      <span className="font-medium text-fuchsia-700">Focus</span>
      <span className="font-medium text-purple-700">Setup</span>
      <span className="font-medium text-slate-700">Buffer</span>
      <span className="ml-auto font-bold text-slate-700">Total Effort {total}pt</span>
    </div>
  )
}

function sumStatus(cards, status) {
  return cards
    .filter((card) => card.status === status)
    .reduce((sum, card) => sum + card.planned_day_blocks.reduce((blockSum, block) => blockSum + block.points, 0), 0)
}
