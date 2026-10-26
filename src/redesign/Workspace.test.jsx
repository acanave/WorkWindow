import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyWorkspace } from './model'
const harness = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), change: null, mounts: [] }))
vi.mock('./controller', () => ({
  mountWorkspace: (_host, state, change) => {
    harness.change = change
    harness.mounts.push(state)
    return () => {}
  },
}))
vi.mock('./cloud', async (original) => ({
  ...(await original()),
  workspaceRepository: () => ({ load: harness.load, save: harness.save }),
}))
import Workspace from './Workspace'
const client = {},
  user = { id: 'owner' }
const key = 'workwindow:redesigned:owner'
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  harness.mounts = []
})
afterEach(cleanup)
describe('workspace cloud lifecycle', () => {
  it('retains unsynced edits after reload and blocks stale drafts from overwriting remote work', async () => {
    const draft = emptyWorkspace()
    draft.notes.push({ id: 'draft', text: 'Keep this thought' })
    localStorage.setItem(key, JSON.stringify({ state: draft, revision: 1, dirty: true }))
    harness.load.mockResolvedValue({ state: emptyWorkspace(), revision: 2 })
    render(<Workspace client={client} user={user} />)
    await screen.findByText('Newer work was saved elsewhere — your edits are kept here')
    expect(harness.mounts.at(-1).notes[0].text).toBe('Keep this thought')
    act(() => harness.change({ ...draft, selected: 'draft' }))
    expect(harness.save).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(key)).dirty).toBe(true)
  })
  it('does not replace a newly saved edit with an older in-flight refresh', async () => {
    const refresh = deferred()
    harness.load.mockResolvedValueOnce({ state: emptyWorkspace(), revision: 1 }).mockReturnValueOnce(refresh.promise)
    harness.save.mockResolvedValue(2)
    render(<Workspace client={client} user={user} />)
    await screen.findByText('Saved')
    act(() => window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(harness.load).toHaveBeenCalledTimes(2))
    const edited = emptyWorkspace()
    edited.notes.push({ id: 'new', text: 'Latest edit' })
    await act(async () => harness.change(edited))
    await screen.findByText('Saved')
    await act(async () => refresh.resolve({ state: emptyWorkspace(), revision: 1 }))
    expect(harness.mounts).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(key)).state.notes[0].text).toBe('Latest edit')
  })
  it('never opens an empty editable workspace after a cloud load failure', async () => {
    harness.load.mockRejectedValue(new Error('Connection unavailable'))
    render(<Workspace client={client} user={user} />)
    await screen.findByRole('alert')
    expect(harness.mounts).toHaveLength(0)
    expect(harness.save).not.toHaveBeenCalled()
  })
})
