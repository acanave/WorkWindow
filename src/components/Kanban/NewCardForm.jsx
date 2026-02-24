import { useState } from 'react'

export default function NewCardForm({ onSubmit }) {
  const [title, setTitle] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim() })
    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3 rounded-md border border-slate-300 bg-white p-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Quick add card..."
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500"
      />
      <button
        type="submit"
        className="mt-2 w-full rounded bg-slate-900 px-2 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Add to Backlog
      </button>
    </form>
  )
}
