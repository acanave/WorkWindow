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
  it('keeps navigation local, skips identical saves, and still saves real edits once', async () => {
    const initial = emptyWorkspace()
    harness.load.mockResolvedValue({ state: initial, revision: 1 })
    harness.save.mockResolvedValue(2)
    render(<Workspace client={client} user={user} />)
    await screen.findByText('Saved')
    const viewed = { ...initial, page: 'boards', boardFilter: 'Test', selected: 'test' }
    await act(async () => harness.change(viewed))
    await act(async () => harness.change(structuredClone(viewed)))
    expect(harness.save).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(key)).dirty).toBe(false)
    expect(JSON.parse(localStorage.getItem(key)).state.page).toBe('boards')
    const edited = { ...viewed, notes: [{ id: 'real-edit', text: 'Keep actual edits' }] }
    await act(async () => harness.change(edited))
    await act(async () => harness.change(structuredClone(edited)))
    expect(harness.save).toHaveBeenCalledTimes(1)
  })
  it('does not mark navigation during an in-flight content save as unsaved work', async () => {
    const save = deferred()
    harness.load.mockResolvedValue({ state: emptyWorkspace(), revision: 1 })
    harness.save.mockReturnValue(save.promise)
    render(<Workspace client={client} user={user} />)
    await screen.findByText('Saved')
    const edited = { ...emptyWorkspace(), notes: [{ id: 'edit', text: 'A change' }] }
    act(() => harness.change(edited))
    act(() => harness.change({ ...edited, page: 'calendar' }))
    await act(async () => save.resolve(2))
    expect(harness.save).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(key)).dirty).toBe(false)
    expect(JSON.parse(localStorage.getItem(key)).state.page).toBe('calendar')
  })
})
