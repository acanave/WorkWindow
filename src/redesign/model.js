export const FORMAT = 'workwindow-redesigned'
const lists = ['notes', 'todos', 'done', 'events', 'reminders', 'projects', 'workItems', 'workWindows']

export function emptyWorkspace() {
  return {
    format: FORMAT,
    version: 4,
    notes: [],
    todos: [],
    done: [],
    events: [],
    reminders: [],
    projects: [],
    workItems: [],
    workWindows: [],
    taskMeta: {},
    selected: null,
    showBacklog: false,
  }
}

export function migrateWorkspace(raw) {
  if (!raw) return emptyWorkspace()
  if (raw.format === FORMAT && raw.version === 4) {
    if (!lists.every((key) => Array.isArray(raw[key])))
      throw new Error('The saved workspace is incomplete. Your original data has not been changed.')
    return structuredClone(raw)
  }
  if (![1, 2].includes(raw.version) || !Array.isArray(raw.cards))
    throw new Error('This workspace format is not supported. Export it before making changes.')
  const next = emptyWorkspace()
  // Retain the original record verbatim. Legacy effort points are NOT hours.
  next.legacyBackup = structuredClone(raw)
  for (const card of raw.cards) {
    const status =
      card.status === 'Done'
        ? 'Done'
        : card.status === 'In Progress'
          ? 'In progress'
          : card.status === 'Blocked'
            ? 'Ready'
            : 'Backlog'
    const legacy = [
      `Imported effort: ${card.completed_points || 0} of ${card.estimate_points || 0} points. Set an hours estimate separately.`,
      ...(card.planned_day_blocks || []).map((b) => `Previously planned: ${b.date} · ${b.points} points`),
    ].join('\n')
    const task = {
      id: card.id,
      title: card.title || 'Untitled task',
      description: card.description || '',
      notes: legacy,
      status,
      date: card.due_date || '',
      dependencies: card.dependencies || [],
      dependsOn: card.dependencies?.[0] || '',
      blocked: card.status === 'Blocked' ? 'Imported blocker — review task details.' : '',
      project: '',
      legacy: structuredClone(card),
    }
    if (status === 'Done')
      next.done.push({
        ...task,
        from: 'workItems',
        completedOn: card.progress_log?.filter((p) => p.delta > 0).at(-1)?.date || '1970-01-01',
      })
    else next.workItems.push(task)
  }
  return next
}

export function exportWorkspace(state, filename = 'workwindow-backup.json') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
