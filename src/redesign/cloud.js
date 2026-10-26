import { migrateWorkspace } from './model'

export class ConflictError extends Error {
  constructor() {
    super('Another session saved newer work. Your edits are kept on this device.')
    this.name = 'ConflictError'
  }
}

// A separate table keeps old clients from overwriting redesigned workspaces.
export function workspaceRepository(client, userId) {
  const table = 'redesigned_workspaces'
  return {
    async load() {
      const { data, error } = await client.from(table).select('state,revision').eq('user_id', userId).maybeSingle()
      if (error) throw error
      if (data) return { state: migrateWorkspace(data.state), revision: data.revision }
      const legacy = await client.from('user_states').select('state').eq('user_id', userId).maybeSingle()
      if (legacy.error) throw legacy.error
      return { state: migrateWorkspace(legacy.data?.state), revision: 0 }
    },
    async save(state, revision) {
      const payload = { user_id: userId, state, revision: revision + 1 }
      const query =
        revision === 0
          ? client.from(table).insert(payload)
          : client.from(table).update(payload).eq('user_id', userId).eq('revision', revision)
      const { data, error } = await query.select('revision').maybeSingle()
      if (error?.code === '23505') throw new ConflictError()
      if (error) throw error
      if (!data) throw new ConflictError()
      return data.revision
    },
  }
}

// Only one request at a time; newer local edits wait behind the in-flight snapshot.
export function createSaveQueue(repository, revision, { saved, status }) {
  let pending = null,
    running = false,
    stopped = false,
    blocked = false
  async function flush() {
    if (running || stopped || blocked || !pending) return
    running = true
    while (pending && !stopped && !blocked) {
      const snapshot = pending
      pending = null
      status('saving')
      try {
        revision = await repository.save(snapshot, revision)
        if (!stopped) saved(snapshot, revision)
      } catch (error) {
        pending = pending || snapshot
        blocked = true
        if (!stopped) status(error instanceof ConflictError ? 'conflict' : 'error')
      }
    }
    running = false
    if (!pending && !stopped && !blocked) status('saved')
  }
  return {
    push(state) {
      pending = structuredClone(state)
      flush()
    },
    retry() {
      blocked = false
      return flush()
    },
    stop() {
      stopped = true
    },
  }
}
