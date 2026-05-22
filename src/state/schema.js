import { createId } from '../utils/id'
import { formatDateKey } from '../utils/date'

export const SCHEMA_VERSION = 2
export const STORAGE_KEY = 'workwindow:data:v2'
export const LEGACY_STORAGE_KEYS = ['workwindow:data:v1']

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
    progress_log: normalizeProgressLog(input.progress_log),
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
  const migrated = migrateToLatest(raw)

  const state = {
    version: SCHEMA_VERSION,
    ui: {
      selectedDate: normalizeDateOrToday(migrated.ui?.selectedDate),
    },
    cards: Array.isArray(migrated.cards) ? migrated.cards.map(createDefaultCard) : [],
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
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON payload')
  }

  assertImportPayload(parsed)

  return normalizeState(parsed)
}

export function migrateToLatest(raw) {
  const version = Number.isInteger(raw?.version) ? raw.version : 1

  if (version > SCHEMA_VERSION) {
    return raw
  }

  if (version <= 1) {
    return migrateV1ToV2(raw)
  }

  return raw
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

function normalizeProgressLog(log) {
  if (!Array.isArray(log)) return []

  return log.map((entry) => ({
    id: entry?.id || createId('p'),
    date: normalizeDateOrToday(entry?.date),
    delta: normalizeInt(entry?.delta, 0, -999, 999),
  }))
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

function migrateV1ToV2(raw) {
  const cards = Array.isArray(raw?.cards) ? raw.cards : []

  return {
    ...raw,
    version: 2,
    cards: cards.map((card) => ({
      ...card,
      progress_log: Array.isArray(card?.progress_log) ? card.progress_log : [],
    })),
  }
}

function assertImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Import payload must be an object')
  }

  const version = Number.isInteger(parsed.version) ? parsed.version : 1

  if (version > SCHEMA_VERSION || version < 1) {
    throw new Error('Unsupported schema version')
  }

  if (!Array.isArray(parsed.cards)) {
    throw new Error('Import payload cards must be an array')
  }

  if (parsed.cards.length > 5000) {
    throw new Error('Import payload has too many cards')
  }

  const explicitIds = parsed.cards.map((card) => card?.id).filter((id) => typeof id === 'string' && id.length > 0)
  const idSet = new Set(explicitIds)
  if (idSet.size !== explicitIds.length) {
    throw new Error('Import payload has duplicate card IDs')
  }
}
