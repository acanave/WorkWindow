import { useEffect, useMemo, useState } from 'react'
import { STATUSES } from '../../state/schema'
import { addMonths, formatDateKey, getMonthGrid, monthLabel, parseDateKey } from '../../utils/date'
import DayCell from './DayCell'
import AgendaStrip from './AgendaStrip'

export default function MonthCalendar({
  cards,
  selectedDate,
  onSelectDate,
  onDropCard,
  onUpdateBlock,
  onDeleteBlock,
}) {
  const [cursor, setCursor] = useState(parseDateKey(selectedDate))
  const [visibleStatuses, setVisibleStatuses] = useState(STATUSES)

  useEffect(() => {
    setCursor(parseDateKey(selectedDate))
  }, [selectedDate])

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

  const monthDays = useMemo(() => getMonthGrid(cursor), [cursor])

  const { blocksByDate, cardTitleById } = useMemo(() => {
    const byDate = {}
    const titleById = {}

    cards.forEach((card) => {
      if (!visibleStatuses.includes(card.status)) return
      titleById[card.id] = card.title
      card.planned_day_blocks.forEach((block) => {
        if (!byDate[block.date]) byDate[block.date] = []
        byDate[block.date].push({ ...block, cardId: card.id })
      })
    })

    return { blocksByDate: byDate, cardTitleById: titleById }
  }, [cards, visibleStatuses])

  const selectedBlocks = blocksByDate[selectedDate] || []

  const jumpToToday = () => {
    const today = new Date()
    setCursor(today)
    onSelectDate(formatDateKey(today))
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((prev) => addMonths(prev, -1))}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            Prev
          </button>
          <button
            onClick={() => setCursor((prev) => addMonths(prev, 1))}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            Next
          </button>
          <button
            onClick={jumpToToday}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            Today
          </button>
        </div>
        <h2 className="text-sm font-semibold text-slate-800">{monthLabel(cursor)}</h2>
      </div>
      <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Calendar filters</div>
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
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => (
          <DayCell
            key={day.dateKey}
            day={day}
            selected={day.dateKey === selectedDate}
            chips={blocksByDate[day.dateKey] || []}
            cardTitleById={cardTitleById}
            onSelect={onSelectDate}
            onDropCard={onDropCard}
            onUpdateBlock={onUpdateBlock}
            onDeleteBlock={onDeleteBlock}
          />
        ))}
      </div>

      <AgendaStrip
        selectedDate={selectedDate}
        blocks={selectedBlocks}
        cardTitleById={cardTitleById}
        onUpdateBlock={onUpdateBlock}
        onDeleteBlock={onDeleteBlock}
      />
    </div>
  )
}
