import { describe, expect, it } from 'vitest'
import { reducer } from './store'

function makeState(cardOverrides = {}) {
  return {
    version: 1,
    ui: { selectedDate: '2026-03-01' },
    cards: [
      {
        id: 'c1',
        title: 'Task',
        description: '',
        status: 'In Progress',
        estimate_points: 4,
        due_date: null,
        dependencies: [],
        planned_day_blocks: [],
        completed_points: 0,
        ...cardOverrides,
      },
    ],
  }
}

describe('store reducer', () => {
  it('does not allow moving incomplete cards to Done', () => {
    const state = makeState({ completed_points: 2 })
    const next = reducer(state, {
      type: 'CARD_MOVE_STATUS',
      payload: { id: 'c1', status: 'Done' },
    })

    expect(next.cards[0].status).toBe('In Progress')
  })

  it('keeps Done when card is complete and moved to Done', () => {
    const state = makeState({ completed_points: 4, status: 'Done' })
    const next = reducer(state, {
      type: 'CARD_MOVE_STATUS',
      payload: { id: 'c1', status: 'Done' },
    })

    expect(next.cards[0].status).toBe('Done')
  })

  it('downgrades Done card to In Progress when progress decreases', () => {
    const state = makeState({ completed_points: 4, status: 'Done' })
    const next = reducer(state, {
      type: 'CARD_LOG_PROGRESS',
      payload: { id: 'c1', delta: -1 },
    })

    expect(next.cards[0].completed_points).toBe(3)
    expect(next.cards[0].status).toBe('In Progress')
  })

  it('adds, updates, and deletes day blocks', () => {
    const base = makeState()
    const added = reducer(base, {
      type: 'DAY_BLOCK_ADD',
      payload: { cardId: 'c1', date: '2026-03-15', points: 2 },
    })

    expect(added.cards[0].planned_day_blocks).toHaveLength(1)
    const blockId = added.cards[0].planned_day_blocks[0].id
    expect(added.cards[0].planned_day_blocks[0].points).toBe(2)

    const updated = reducer(added, {
      type: 'DAY_BLOCK_UPDATE',
      payload: { cardId: 'c1', blockId, points: 6 },
    })
    expect(updated.cards[0].planned_day_blocks[0].points).toBe(6)

    const deleted = reducer(updated, {
      type: 'DAY_BLOCK_DELETE',
      payload: { cardId: 'c1', blockId },
    })
    expect(deleted.cards[0].planned_day_blocks).toHaveLength(0)
  })
})
