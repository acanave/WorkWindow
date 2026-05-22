import { describe, expect, it } from 'vitest'
import { normalizeState, parseImportPayload, SCHEMA_VERSION } from './schema'

describe('schema migration and import validation', () => {
  it('migrates v1 state to latest with progress logs', () => {
    const migrated = normalizeState({
      version: 1,
      ui: { selectedDate: '2026-03-01' },
      cards: [
        {
          id: 'c1',
          title: 'Task',
          status: 'In Progress',
          estimate_points: 4,
          completed_points: 1,
          planned_day_blocks: [],
        },
      ],
    })

    expect(migrated.version).toBe(SCHEMA_VERSION)
    expect(Array.isArray(migrated.cards[0].progress_log)).toBe(true)
    expect(migrated.cards[0].progress_log).toHaveLength(0)
  })

  it('accepts v1 import payload and normalizes to latest version', () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        version: 1,
        ui: { selectedDate: '2026-03-01' },
        cards: [{ id: 'c1', title: 'Task', planned_day_blocks: [] }],
      }),
    )

    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.cards[0].progress_log).toEqual([])
  })

  it('loads future runtime state by normalizing known fields', () => {
    const parsed = normalizeState({
      version: 99,
      ui: { selectedDate: '2026-03-01' },
      cards: [{ id: 'c1', title: 'Future Task', planned_day_blocks: [] }],
    })

    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.cards[0].title).toBe('Future Task')
  })

  it('rejects duplicate card IDs during import', () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          version: 1,
          cards: [{ id: 'c1' }, { id: 'c1' }],
        }),
      ),
    ).toThrow(/duplicate card ids/i)
  })
})
