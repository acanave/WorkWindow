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
      className={compact ? 'space-y-2' : 'mb-3 rounded-md border border-slate-300 bg-white p-2'}
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Quick add work item..."
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Add work item
      </button>
    </form>
  )
}
