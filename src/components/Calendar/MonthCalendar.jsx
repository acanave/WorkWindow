import { useEffect, useMemo, useState } from 'react'
import { STATUSES } from '../../state/schema'
import { addMonths, formatDateKey, getMonthGrid, monthLabel, parseDateKey } from '../../utils/date'
import DayCell from './DayCell'
import AgendaStrip from './AgendaStrip'

export default function MonthCalendar({
  cards,
  riskByCardId = {},
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

  const { anchorsByDate, blocksByDate, cardMetaById } = useMemo(() => {
    const anchors = {}
    const blocks = {}
    const metaById = {}

    cards.forEach((card) => {
      if (!visibleStatuses.includes(card.status)) return
      const cardMeta = {
        dueDate: card.due_date,
        title: card.title,
        accent: getCardAccent(card.id),
      }
      metaById[card.id] = cardMeta

      if (card.due_date) {
        if (!anchors[card.due_date]) anchors[card.due_date] = []
        anchors[card.due_date].push({
          id: `anchor-${card.id}`,
          cardId: card.id,
          date: card.due_date,
          accent: cardMeta.accent,
        })
      }

      card.planned_day_blocks.forEach((block) => {
        if (!blocks[block.date]) blocks[block.date] = []
        blocks[block.date].push({ ...block, cardId: card.id, accent: cardMeta.accent })
      })
    })

    return { anchorsByDate: anchors, blocksByDate: blocks, cardMetaById: metaById }
  }, [cards, visibleStatuses])

  const selectedBlocks = blocksByDate[selectedDate] || []
  const selectedAnchors = anchorsByDate[selectedDate] || []

  const jumpToToday = () => {
    const today = new Date()
    setCursor(today)
    onSelectDate(formatDateKey(today))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCursor((prev) => addMonths(prev, -1))}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-700 hover:bg-slate-50"
            aria-label="Previous month"
          >
            {'<'}
          </button>
          <button
            onClick={() => setCursor((prev) => addMonths(prev, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-700 hover:bg-slate-50"
            aria-label="Next month"
          >
            {'>'}
          </button>
          <h2 className="min-w-[150px] text-2xl font-bold tracking-normal text-slate-950">{monthLabel(cursor)}</h2>
          <button onClick={jumpToToday} className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium">
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700">
            Month
          </button>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-1">
            {STATUSES.map((status) => {
              const active = visibleStatuses.includes(status)
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              )
            })}
          </div>
          <button className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            ...
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_294px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
            <div className="py-4">Sun</div>
            <div className="py-4">Mon</div>
            <div className="py-4">Tue</div>
            <div className="py-4">Wed</div>
            <div className="py-4">Thu</div>
            <div className="py-4">Fri</div>
            <div className="py-4">Sat</div>
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day) => (
              <DayCell
                key={day.dateKey}
                day={day}
                selected={day.dateKey === selectedDate}
                anchors={anchorsByDate[day.dateKey] || []}
                workWindows={blocksByDate[day.dateKey] || []}
                cardMetaById={cardMetaById}
                onSelect={onSelectDate}
                onDropCard={onDropCard}
                onUpdateBlock={onUpdateBlock}
                onDeleteBlock={onDeleteBlock}
              />
            ))}
          </div>
        </section>

        <AgendaStrip
          selectedDate={selectedDate}
          anchors={selectedAnchors}
          blocks={selectedBlocks}
          cardMetaById={cardMetaById}
          riskByCardId={riskByCardId}
          onUpdateBlock={onUpdateBlock}
          onDeleteBlock={onDeleteBlock}
        />
      </div>

      <CalendarLegend />
    </div>
  )
}

function CalendarLegend() {
  return (
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-[1fr_1.15fr_1fr]">
      <div className="flex items-center gap-4">
        <span className="rounded-lg bg-blue-600 px-6 py-3 text-xs font-bold uppercase text-white">Anchor</span>
        <div>
          <p className="font-bold text-slate-950">Anchor Task</p>
          <p className="text-slate-500">The scheduled event or deadline</p>
        </div>
      </div>
      <div className="flex items-center gap-4 border-slate-200 md:border-l md:pl-5">
        <span className="h-10 w-24 rounded-lg border border-dashed border-blue-300 bg-blue-50" />
        <div>
          <p className="font-bold text-slate-950">Work Window</p>
          <p className="text-slate-500">The time needed to make it happen</p>
        </div>
      </div>
      <div className="border-slate-200 md:border-l md:pl-5">
        <p className="font-bold text-slate-950">True Time Footprint</p>
        <p className="text-slate-500">Travel, prep, focus, setup, buffer</p>
      </div>
    </section>
  )
}

const CARD_ACCENTS = [
  {
    workWindow: 'border-l-cyan-500 bg-cyan-50 text-cyan-950 hover:bg-cyan-100',
    anchor: 'border-cyan-600 bg-cyan-600 text-white',
    agenda: 'border-l-cyan-500',
  },
  {
    workWindow: 'border-l-emerald-500 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
    anchor: 'border-emerald-600 bg-emerald-600 text-white',
    agenda: 'border-l-emerald-500',
  },
  {
    workWindow: 'border-l-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100',
    anchor: 'border-amber-600 bg-amber-600 text-white',
    agenda: 'border-l-amber-500',
  },
  {
    workWindow: 'border-l-fuchsia-500 bg-fuchsia-50 text-fuchsia-950 hover:bg-fuchsia-100',
    anchor: 'border-fuchsia-600 bg-fuchsia-600 text-white',
    agenda: 'border-l-fuchsia-500',
  },
  {
    workWindow: 'border-l-sky-500 bg-sky-50 text-sky-950 hover:bg-sky-100',
    anchor: 'border-sky-600 bg-sky-600 text-white',
    agenda: 'border-l-sky-500',
  },
]

function getCardAccent(cardId) {
  const hash = Array.from(cardId).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return CARD_ACCENTS[hash % CARD_ACCENTS.length]
}
