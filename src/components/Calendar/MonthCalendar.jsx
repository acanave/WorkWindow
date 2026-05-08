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
  onCreateCardFromWindowRange,
  onOpenCard,
  onUpdateBlock,
  onDeleteBlock,
}) {
  const [cursor, setCursor] = useState(parseDateKey(selectedDate))
  const [visibleStatuses, setVisibleStatuses] = useState(STATUSES)
  const [dragRange, setDragRange] = useState(null)

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
  const weeks = useMemo(() => chunkWeeks(monthDays), [monthDays])

  const { anchorsByDate, blocksByDate, cardMetaById, windowSegmentsByWeek } = useMemo(() => {
    const anchors = {}
    const blocks = {}
    const metaById = {}
    const segmentsByWeek = {}

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

    weeks.forEach((week, weekIndex) => {
      segmentsByWeek[weekIndex] = buildWeekWindowSegments(cards, week, visibleStatuses, metaById)
    })

    return {
      anchorsByDate: anchors,
      blocksByDate: blocks,
      cardMetaById: metaById,
      windowSegmentsByWeek: segmentsByWeek,
    }
  }, [cards, visibleStatuses, weeks])

  const selectedBlocks = blocksByDate[selectedDate] || []
  const selectedAnchors = anchorsByDate[selectedDate] || []

  const jumpToToday = () => {
    const today = new Date()
    setCursor(today)
    onSelectDate(formatDateKey(today))
  }

  const startRange = (dateKey) => {
    setDragRange({ active: true, start: dateKey, end: dateKey })
    onSelectDate(dateKey)
  }

  const extendRange = (dateKey) => {
    setDragRange((current) => (current?.active ? { ...current, end: dateKey } : current))
  }

  const finishRange = (dateKey) => {
    setDragRange((current) => {
      if (!current?.active) return current
      const range = normalizeRange(current.start, dateKey)
      if (range.start !== range.end && onCreateCardFromWindowRange) {
        const title = window.prompt('Name this new work item')
        if (title?.trim()) {
          onCreateCardFromWindowRange({ startDate: range.start, endDate: range.end, title: title.trim() })
        }
      } else {
        onSelectDate(dateKey)
      }
      return null
    })
  }

  const selectedRange = dragRange ? normalizeRange(dragRange.start, dragRange.end) : null

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCursor((prev) => addMonths(prev, -1))}
            className="ww-button flex h-11 w-11 items-center justify-center text-xl text-[color:var(--ww-muted)]"
            aria-label="Previous month"
          >
            {'<'}
          </button>
          <button
            onClick={() => setCursor((prev) => addMonths(prev, 1))}
            className="ww-button flex h-11 w-11 items-center justify-center text-xl text-[color:var(--ww-muted)]"
            aria-label="Next month"
          >
            {'>'}
          </button>
          <h2 className="min-w-[150px] text-2xl font-semibold tracking-normal text-[color:var(--ww-heading)]">
            {monthLabel(cursor)}
          </h2>
          <button onClick={jumpToToday} className="ww-button px-5 py-3 text-sm">
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="ww-button px-5 py-3 text-sm">Month</button>
          <div className="flex flex-wrap gap-1 rounded-lg border border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-1">
            {STATUSES.map((status) => {
              const active = visibleStatuses.includes(status)
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    active
                      ? 'bg-[color:var(--ww-accent-soft)] text-[color:var(--ww-accent)]'
                      : 'text-[color:var(--ww-muted)] hover:[background:var(--ww-soft-panel-bg)]'
                  }`}
                >
                  {status}
                </button>
              )
            })}
          </div>
          <button className="ww-button px-4 py-3 text-sm">...</button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_294px]">
        <section className="ww-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[color:var(--ww-border-soft)] text-center text-xs font-semibold uppercase tracking-wide text-[color:var(--ww-muted)] [background:var(--ww-soft-panel-bg)]">
            <div className="py-4">Sun</div>
            <div className="py-4">Mon</div>
            <div className="py-4">Tue</div>
            <div className="py-4">Wed</div>
            <div className="py-4">Thu</div>
            <div className="py-4">Fri</div>
            <div className="py-4">Sat</div>
          </div>

          <div>
            {weeks.map((week, weekIndex) => (
              <div key={week[0].dateKey} className="relative grid grid-cols-7">
                {week.map((day) => (
                  <DayCell
                    key={day.dateKey}
                    day={day}
                    selected={day.dateKey === selectedDate}
                    inDragRange={Boolean(
                      selectedRange && day.dateKey >= selectedRange.start && day.dateKey <= selectedRange.end,
                    )}
                    anchors={anchorsByDate[day.dateKey] || []}
                    cardMetaById={cardMetaById}
                    onSelect={onSelectDate}
                    onStartRange={startRange}
                    onExtendRange={extendRange}
                    onFinishRange={finishRange}
                    onDropCard={onDropCard}
                  />
                ))}
                <div className="pointer-events-none absolute inset-x-0 top-[58px] z-20 grid grid-cols-7 gap-0 px-3">
                  {(windowSegmentsByWeek[weekIndex] || []).map((segment, rowIndex) => (
                    <WindowSpan key={segment.id} segment={segment} rowIndex={rowIndex} onOpenCard={onOpenCard} />
                  ))}
                </div>
              </div>
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
    <section className="ww-card grid gap-4 p-4 text-sm md:grid-cols-[1fr_1.15fr_1fr]">
      <div className="flex items-center gap-4">
        <span className="rounded-lg border border-[color:var(--ww-accent-border)] px-6 py-3 text-xs font-bold uppercase text-[color:var(--ww-accent)] [background:var(--ww-accent-soft)]">
          Anchor
        </span>
        <div>
          <p className="font-semibold text-[color:var(--ww-heading)]">Anchor Task</p>
          <p className="text-[color:var(--ww-muted)]">The scheduled event or deadline</p>
        </div>
      </div>
      <div className="flex items-center gap-4 border-[color:var(--ww-border)] md:border-l md:pl-5">
        <span className="h-10 w-24 rounded-lg border border-dashed border-[color:var(--ww-accent-border)] bg-[color:var(--ww-accent-soft)]" />
        <div>
          <p className="font-semibold text-[color:var(--ww-heading)]">Work Window</p>
          <p className="text-[color:var(--ww-muted)]">The time needed to make it happen</p>
        </div>
      </div>
      <div className="border-[color:var(--ww-border)] md:border-l md:pl-5">
        <p className="font-semibold text-[color:var(--ww-heading)]">True Time Footprint</p>
        <p className="text-[color:var(--ww-muted)]">Travel, prep, focus, setup, buffer</p>
      </div>
    </section>
  )
}

function WindowSpan({ segment, rowIndex, onOpenCard }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpenCard?.(segment.cardId)
      }}
      className={`pointer-events-auto h-8 truncate rounded-lg border px-3 text-left text-[11px] font-semibold shadow-sm ${
        segment.accent?.workWindow ||
        'border-l-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/45 dark:text-blue-100'
      }`}
      style={{
        gridColumn: `${segment.startColumn + 1} / ${segment.endColumn + 2}`,
        marginTop: `${rowIndex * 34}px`,
      }}
      title={`Work window: ${segment.title} • ${segment.points}pt • ${segment.startDate} to ${segment.endDate}`}
    >
      <span className="mr-1 text-[10px] uppercase opacity-75">Window</span>
      {segment.title} • {segment.points}pt
    </button>
  )
}

function chunkWeeks(days) {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7))
}

function buildWeekWindowSegments(cards, week, visibleStatuses, cardMetaById) {
  const weekDateSet = new Set(week.map((day) => day.dateKey))
  const columnByDate = Object.fromEntries(week.map((day, index) => [day.dateKey, index]))

  return cards
    .filter((card) => visibleStatuses.includes(card.status))
    .map((card) => {
      const blocks = card.planned_day_blocks.filter((block) => weekDateSet.has(block.date))
      if (blocks.length === 0) return null
      const columns = blocks.map((block) => columnByDate[block.date])
      const dates = blocks.map((block) => block.date).sort()
      return {
        id: `${card.id}-${week[0].dateKey}`,
        cardId: card.id,
        title: card.title,
        startColumn: Math.min(...columns),
        endColumn: Math.max(...columns),
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        points: blocks.reduce((sum, block) => sum + block.points, 0),
        accent: cardMetaById[card.id]?.accent,
      }
    })
    .filter(Boolean)
}

function normalizeRange(startDate, endDate) {
  return startDate <= endDate ? { start: startDate, end: endDate } : { start: endDate, end: startDate }
}

const CARD_ACCENTS = [
  {
    workWindow:
      'border-l-cyan-500 bg-cyan-50 text-cyan-950 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100 dark:hover:bg-cyan-900/60',
    anchor: 'border-cyan-200 bg-cyan-100 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-100',
    agenda: 'border-l-cyan-500',
  },
  {
    workWindow:
      'border-l-emerald-500 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-900/60',
    anchor:
      'border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
    agenda: 'border-l-emerald-500',
  },
  {
    workWindow:
      'border-l-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60',
    anchor:
      'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
    agenda: 'border-l-amber-500',
  },
  {
    workWindow:
      'border-l-fuchsia-500 bg-fuchsia-50 text-fuchsia-950 hover:bg-fuchsia-100 dark:border-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-100 dark:hover:bg-fuchsia-900/60',
    anchor:
      'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-100',
    agenda: 'border-l-fuchsia-500',
  },
  {
    workWindow:
      'border-l-sky-500 bg-sky-50 text-sky-950 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60',
    anchor: 'border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100',
    agenda: 'border-l-sky-500',
  },
]

function getCardAccent(cardId) {
  const hash = Array.from(cardId).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return CARD_ACCENTS[hash % CARD_ACCENTS.length]
}
