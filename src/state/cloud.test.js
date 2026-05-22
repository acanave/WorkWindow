import { beforeEach, describe, expect, it, vi } from 'vitest'

const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ maybeSingle }))
const select = vi.fn(() => ({ eq }))
const upsert = vi.fn()
const from = vi.fn(() => ({ select, upsert }))

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ from }),
}))

import { fetchRemoteState, saveRemoteState } from './cloud'

describe('cloud state access', () => {
  beforeEach(() => {
    from.mockClear()
    select.mockClear()
    eq.mockClear()
    maybeSingle.mockClear()
    upsert.mockClear()
    upsert.mockResolvedValue({ error: null })
  })

  it('fetches the signed-in user state by user id', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        state: {
          version: 2,
          ui: { selectedDate: '2026-05-21' },
          cards: [],
        },
      },
      error: null,
    })

    const state = await fetchRemoteState('user-123')

    expect(from).toHaveBeenCalledWith('user_states')
    expect(select).toHaveBeenCalledWith('state')
    expect(eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(maybeSingle).toHaveBeenCalled()
    expect(state).toMatchObject({
      version: 2,
      ui: { selectedDate: '2026-05-21' },
      cards: [],
    })
  })

  it('upserts normalized state for the signed-in user', async () => {
    await saveRemoteState('user-123', {
      version: 2,
      ui: { selectedDate: '2026-05-21' },
      cards: [],
    })

    expect(from).toHaveBeenCalledWith('user_states')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        state: expect.objectContaining({
          version: 2,
          ui: { selectedDate: '2026-05-21' },
          cards: [],
        }),
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' },
    )
  })
})
