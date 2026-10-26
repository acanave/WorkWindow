import { describe, it, expect } from 'vitest'
import { emptyWorkspace, migrateWorkspace } from './model'
describe('release migration', () => {
  it('starts empty, without fixtures', () => {
    const s = emptyWorkspace()
    for (const key of ['projects', 'workItems', 'notes', 'done', 'events', 'reminders', 'workWindows'])
      expect(s[key]).toEqual([])
  })
  it('keeps every original field and does not convert points into hours', () => {
    const old = {
      version: 2,
      cards: [
        {
          id: 'a',
          title: 'Real task',
          status: 'Blocked',
          estimate_points: 4,
          completed_points: 1,
          dependencies: ['b', 'c'],
          due_date: '2026-11-01',
          planned_day_blocks: [{ date: '2026-10-26', points: 2 }],
          progress_log: [],
        },
      ],
    }
    const s = migrateWorkspace(old)
    expect(s.legacyBackup).toEqual(old)
    expect(s.workItems[0].legacy).toEqual(old.cards[0])
    expect(s.workItems[0].dependencies).toEqual(['b', 'c'])
    expect(s.workItems[0].date).toBe('2026-11-01')
    expect(s.workWindows).toEqual([])
    expect(s.workItems[0].notes).toContain('4 points')
    expect(old.cards[0].status).toBe('Blocked')
  })
  it('rejects unsupported or malformed state instead of erasing it', () => {
    expect(() => migrateWorkspace({ version: 99 })).toThrow()
    expect(() => migrateWorkspace({ ...emptyWorkspace(), notes: null })).toThrow()
  })
  it('round-trips redesigned state without removing new fields', () => {
    const s = emptyWorkspace()
    s.notes.push({ id: 'n', text: 'Keep me' })
    s.workWindows.push({ id: 'w', effort: 90 })
    expect(migrateWorkspace(s)).toEqual(s)
    expect(migrateWorkspace(s)).not.toBe(s)
  })
})
