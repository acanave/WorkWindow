import { createId } from '../utils/id'
import { formatDateKey } from '../utils/date'

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'workwindow:data:v1'

export const STATUSES = ['Backlog', 'In Progress', 'Blocked', 'Done']

export function createDefaultCard(input = {}) {
  const estimate = normalizeInt(input.estimate_points, 4, 1, 999)
  const completed = normalizeInt(input.completed_points, 0, 0, 999)
  const requestedStatus = STATUSES.includes(input.status) ? input.status : 'Backlog'
  const status = completed >= estimate ? 'Done' : requestedStatus === 'Done' ? 'In Progress' : requestedStatus

  return {
    id: input.id || createId('c'),
    title: input.title || 'Untitled task',
    description: input.description || '',
    status,
    estimate_points: estimate,
    due_date: normalizeDateOrNull(input.due_date),
    dependencies: Array.isArray(input.dependencies) ? input.dependencies.filter(Boolean) : [],
    planned_day_blocks: normalizeBlocks(input.planned_day_blocks),
    completed_points: completed,
  }
}

export function createInitialState() {
  return {
    version: SCHEMA_VERSION,
    ui: {
      selectedDate: formatDateKey(new Date()),
    },
    cards: [],
  }
}

export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return createInitialState()

  const state = {
    version: SCHEMA_VERSION,
    ui: {
      selectedDate: normalizeDateOrToday(raw.ui?.selectedDate),
    },
    cards: Array.isArray(raw.cards) ? raw.cards.map(createDefaultCard) : [],
  }

  const cardIdSet = new Set(state.cards.map((card) => card.id))

  state.cards = state.cards.map((card) => {
    const dependencies = card.dependencies.filter((depId) => depId !== card.id && cardIdSet.has(depId))
    const completed = Math.min(card.completed_points, card.estimate_points)

    return {
      ...card,
      dependencies,
      completed_points: completed,
      status: completed >= card.estimate_points ? 'Done' : card.status === 'Done' ? 'In Progress' : card.status,
    }
  })

  return state
}

export function parseImportPayload(text) {
  const parsed = JSON.parse(text)
  if (parsed?.version !== SCHEMA_VERSION) {
    throw new Error('Unsupported schema version')
  }
  const normalized = normalizeState(parsed)
  return normalized
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []

  return blocks
    .map((block) => ({
      id: block?.id || createId('b'),
      date: normalizeDateOrToday(block?.date),
      points: normalizeInt(block?.points, 1, 1, 8),
    }))
    .filter(Boolean)
}

function normalizeDateOrNull(value) {
  if (!value) return null
  if (typeof value !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return null
}

function normalizeDateOrToday(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  return formatDateKey(new Date())
}

function normalizeInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
