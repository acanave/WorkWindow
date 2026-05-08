import { useEffect, useMemo, useState } from 'react'
import { STATUSES } from '../../state/schema'

export default function CardModal({
  mode,
  card,
  allCards,
  blockedBy = [],
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onLogProgress,
}) {
  const [title, setTitle] = useState(card?.title || '')
  const [description, setDescription] = useState(card?.description || '')
  const [status, setStatus] = useState(card?.status || 'Backlog')
  const [estimate, setEstimate] = useState(card?.estimate_points || 4)
  const [dueDate, setDueDate] = useState(card?.due_date || '')
  const initialWindow = getInitialWindow(card)
  const [windowStart, setWindowStart] = useState(initialWindow.start)
  const [windowEnd, setWindowEnd] = useState(initialWindow.end)
  const [windowPoints, setWindowPoints] = useState(initialWindow.points)
  const [dependencies, setDependencies] = useState(card?.dependencies || [])

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const completion = useMemo(() => {
    if (!card) return 0
    return Math.round((card.completed_points / card.estimate_points) * 100)
  }, [card])

  const dependencyOptions = allCards.filter((item) => item.id !== card?.id)
  const unresolvedSelectedDependencies = dependencyOptions.filter(
    (dep) => dependencies.includes(dep.id) && dep.status !== 'Done',
  )

  const handleDependencyToggle = (depId) => {
    setDependencies((prev) => (prev.includes(depId) ? prev.filter((id) => id !== depId) : [...prev, depId]))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const plannedBlocks =
      windowStart && windowEnd
        ? buildDayBlocksForRange(windowStart, windowEnd, Number.parseInt(windowPoints, 10) || 1)
        : []

    const payload = {
      title: title.trim() || 'Untitled task',
      description: description.trim(),
      status,
      estimate_points: Number.parseInt(estimate, 10) || 4,
      due_date: dueDate || windowEnd || null,
      dependencies,
      planned_day_blocks: plannedBlocks,
    }

    if (mode === 'create') {
      onCreate(payload)
    } else {
      onUpdate(card.id, payload)
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--ww-heading)]">
            {mode === 'create' ? 'Create Work Item' : 'Edit Work Item'}
          </h2>
          <button onClick={onClose} className="ww-button px-2 py-1 text-sm">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="ww-input w-full px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="ww-input w-full px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="ww-input w-full px-2 py-2 text-sm"
              >
                {STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Required window points</span>
              <input
                type="number"
                min={1}
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                className="ww-input w-full px-2 py-2 text-sm"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Anchor due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="ww-input w-full px-2 py-2 text-sm"
              />
            </label>
          </div>

          <fieldset className="rounded-xl border border-[color:var(--ww-accent-border)] bg-[color:var(--ww-accent-soft)] p-3">
            <legend className="px-1 text-sm font-semibold text-[color:var(--ww-accent)]">Work window</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Start</span>
                <input
                  type="date"
                  value={windowStart}
                  onChange={(event) => setWindowStart(event.target.value)}
                  className="ww-input w-full px-2 py-2 text-sm"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">End</span>
                <input
                  type="date"
                  value={windowEnd}
                  onChange={(event) => setWindowEnd(event.target.value)}
                  className="ww-input w-full px-2 py-2 text-sm"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-[color:var(--ww-text)]">Pts/day</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={windowPoints}
                  onChange={(event) => setWindowPoints(event.target.value)}
                  className="ww-input w-full px-2 py-2 text-sm"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-[color:var(--ww-accent)]">
              These dates render as a horizontal allowed-work window on the calendar. The anchor due date remains the
              deadline.
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-[color:var(--ww-text)]">Dependencies</legend>
            <div className="max-h-24 space-y-1 overflow-y-auto rounded border border-[color:var(--ww-border)] bg-[color:var(--ww-soft-panel-bg)] p-2">
              {dependencyOptions.length === 0 && (
                <p className="text-sm text-[color:var(--ww-muted)]">No cards available.</p>
              )}
              {dependencyOptions.map((dep) => (
                <label key={dep.id} className="flex items-center gap-2 text-sm text-[color:var(--ww-text)]">
                  <input
                    type="checkbox"
                    checked={dependencies.includes(dep.id)}
                    onChange={() => handleDependencyToggle(dep.id)}
                  />
                  <span>{dep.title}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {(mode === 'edit' || unresolvedSelectedDependencies.length > 0) && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/50">
              <h3 className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">Blocked by</h3>
              {unresolvedSelectedDependencies.length === 0 && blockedBy.length === 0 ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">No unresolved dependencies.</p>
              ) : (
                <ul className="space-y-1">
                  {(unresolvedSelectedDependencies.length > 0 ? unresolvedSelectedDependencies : blockedBy).map(
                    (dep) => (
                      <li key={dep.id} className="text-xs text-amber-900 dark:text-amber-100">
                        {dep.title} ({dep.status})
                      </li>
                    ),
                  )}
                </ul>
              )}
            </section>
          )}

          {card && (
            <div className="rounded-xl border border-[color:var(--ww-border)] bg-[color:var(--ww-soft-panel-bg)] p-3">
              <p className="text-sm text-[color:var(--ww-text)]">
                Work completed: {card.completed_points}/{card.estimate_points} ({completion}%)
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onLogProgress(card.id, -1)}
                  className="ww-button px-2 py-1 text-xs"
                >
                  -1 completed
                </button>
                <button type="button" onClick={() => onLogProgress(card.id, 1)} className="ww-button px-2 py-1 text-xs">
                  +1 completed
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(card.id)
                  onClose()
                }}
                className="rounded border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/40"
              >
                Delete Card
              </button>
            ) : (
              <span />
            )}

            <button type="submit" className="ww-button ww-button-primary px-3 py-2 text-sm font-semibold">
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getInitialWindow(card) {
  const blocks = Array.isArray(card?.planned_day_blocks) ? card.planned_day_blocks : []
  if (blocks.length === 0) return { start: '', end: '', points: 1 }
  const dates = blocks.map((block) => block.date).sort()
  const firstPoints = blocks[0]?.points || 1
  return { start: dates[0], end: dates[dates.length - 1], points: firstPoints }
}

function buildDayBlocksForRange(startDate, endDate, points) {
  const start = startDate <= endDate ? startDate : endDate
  const end = startDate <= endDate ? endDate : startDate
  const blocks = []
  let cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)

  while (cursor <= last) {
    blocks.push({ date: cursor.toISOString().slice(0, 10), points })
    cursor.setDate(cursor.getDate() + 1)
  }

  return blocks
}
