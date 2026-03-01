import { LEGACY_STORAGE_KEYS, STORAGE_KEY, normalizeState, parseImportPayload } from './schema'

export function loadState() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]

  try {
    for (const key of keys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const state = normalizeState(JSON.parse(raw))

      if (key !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      }

      return state
    }

    return null
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    LEGACY_STORAGE_KEYS.forEach((legacyKey) => localStorage.removeItem(legacyKey))
  } catch {
    // ignore localStorage write failures
  }
}

export function downloadStateAsJson(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'workwindow-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportedJson(text) {
  return parseImportPayload(text)
}
