import { useState } from 'react'

export default function NewCardForm({ onSubmit, compact = false }) {
  const [title, setTitle] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim() })
    setTitle('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? 'space-y-2'
          : 'mb-3 rounded-md border border-[color:var(--ww-border)] bg-[color:var(--ww-panel-bg)] p-2'
      }
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Quick add work item..."
        className="ww-input w-full px-3 py-2 text-sm"
      />
      <button type="submit" className="ww-button ww-button-primary w-full px-3 py-2 text-sm font-semibold">
        Add work item
      </button>
    </form>
  )
}
