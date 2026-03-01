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
    const payload = {
      title: title.trim() || 'Untitled task',
      description: description.trim(),
      status,
      estimate_points: Number.parseInt(estimate, 10) || 4,
      due_date: dueDate || null,
      dependencies,
    }

    if (mode === 'create') {
      onCreate(payload)
    } else {
      onUpdate(card.id, payload)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-lg bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === 'create' ? 'Create Card' : 'Edit Card'}
          </h2>
          <button onClick={onClose} className="rounded border border-slate-300 px-2 py-1 text-sm">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
              >
                {STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Estimate points</span>
              <input
                type="number"
                min={1}
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700">Dependencies</legend>
            <div className="max-h-24 space-y-1 overflow-y-auto rounded border border-slate-300 p-2">
              {dependencyOptions.length === 0 && <p className="text-sm text-slate-500">No cards available.</p>}
              {dependencyOptions.map((dep) => (
                <label key={dep.id} className="flex items-center gap-2 text-sm">
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
            <section className="rounded border border-amber-200 bg-amber-50 p-2">
              <h3 className="mb-1 text-sm font-semibold text-amber-900">Blocked by</h3>
              {unresolvedSelectedDependencies.length === 0 && blockedBy.length === 0 ? (
                <p className="text-xs text-amber-800">No unresolved dependencies.</p>
              ) : (
                <ul className="space-y-1">
                  {(unresolvedSelectedDependencies.length > 0
                    ? unresolvedSelectedDependencies
                    : blockedBy
                  ).map((dep) => (
                    <li key={dep.id} className="text-xs text-amber-900">
                      {dep.title} ({dep.status})
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {card && (
            <div className="rounded border border-slate-200 bg-slate-50 p-2">
              <p className="text-sm text-slate-700">
                Progress: {card.completed_points}/{card.estimate_points} ({completion}%)
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onLogProgress(card.id, -1)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  -1 completed
                </button>
                <button
                  type="button"
                  onClick={() => onLogProgress(card.id, 1)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
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
                className="rounded border border-rose-300 px-3 py-2 text-sm text-rose-700"
              >
                Delete Card
              </button>
            ) : (
              <span />
            )}

            <button type="submit" className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
