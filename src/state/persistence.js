import { STORAGE_KEY, normalizeState, parseImportPayload } from './schema'

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore localStorage write failures in v1
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
