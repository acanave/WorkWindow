import { useEffect, useRef, useState } from 'react'
import { mountWorkspace } from './controller'
import template from './template.html?raw'
import './workspace.css'
import { emptyWorkspace, migrateWorkspace, exportWorkspace } from './model'
import { createSaveQueue, workspaceRepository } from './cloud'

const storageKey = (id) => `workwindow:redesigned:${id || 'local'}`
function readCache(id) {
  return JSON.parse(localStorage.getItem(storageKey(id)) || 'null')
}
function writeCache(id, value) {
  localStorage.setItem(storageKey(id), JSON.stringify(value))
}

export default function Workspace({ client = null, user = null, onSignOut }) {
  const host = useRef(null),
    latest = useRef(null),
    queue = useRef(null),
    dirty = useRef(false)
  const [workspace, setWorkspace] = useState(null),
    [status, setStatus] = useState('loading'),
    [error, setError] = useState(''),
    [generation, setGeneration] = useState(0)
  const id = user?.id
  useEffect(() => {
    let disposed = false,
      refreshRunning = false
    const repository = client && id ? workspaceRepository(client, id) : null
    let revision = 0
    async function start() {
      try {
        const cached = readCache(id)
        const loaded = repository
          ? await repository.load()
          : {
              state: cached?.state ? migrateWorkspace(cached.state) : emptyWorkspace(),
              revision: cached?.revision || 0,
            }
        if (disposed) return
        revision = loaded.revision
        try {
          if (!cached?.dirty) writeCache(id, { state: loaded.state, revision, dirty: false })
        } catch {
          /* cloud data stays authoritative */
        }
        const pending = !!cached?.dirty
        const value = pending ? migrateWorkspace(cached.state) : loaded.state
        latest.current = value
        dirty.current = pending
        setWorkspace(value)
        setStatus(repository ? 'saved' : 'local')
        setError('')
        if (repository) {
          queue.current = createSaveQueue(repository, revision, {
            status: setStatus,
            saved(snapshot, newRevision) {
              revision = newRevision
              dirty.current = JSON.stringify(latest.current) !== JSON.stringify(snapshot)
              try {
                writeCache(id, { state: latest.current, revision, dirty: dirty.current })
              } catch {
                /* remote save remains authoritative */
              }
            },
          })
          if (pending && cached.revision !== revision) {
            queue.current.stop()
            setStatus('conflict')
          } else if (pending) queue.current.push(value)
        }
      } catch (e) {
        if (!disposed) {
          setError(e.message)
          setStatus('error')
        }
      }
    }
    start()
    async function refresh() {
      if (
        disposed ||
        !repository ||
        refreshRunning ||
        dirty.current ||
        document.visibilityState === 'hidden' ||
        host.current?.querySelector('dialog[open]') ||
        /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)
      )
        return
      refreshRunning = true
      const requestedRevision = revision
      try {
        const remote = await repository.load()
        if (!disposed && !dirty.current && revision === requestedRevision && remote.revision > revision) {
          queue.current?.stop()
          revision = remote.revision
          latest.current = remote.state
          try {
            writeCache(id, { state: remote.state, revision, dirty: false })
          } catch {
            /* remote state is still available; the next edit reports storage errors */
          }
          setWorkspace(remote.state)
          queue.current = createSaveQueue(repository, revision, {
            status: setStatus,
            saved(snapshot, newRevision) {
              revision = newRevision
              dirty.current = JSON.stringify(latest.current) !== JSON.stringify(snapshot)
              try {
                writeCache(id, { state: latest.current, revision, dirty: dirty.current })
              } catch {
                /* remote save succeeded */
              }
            },
          })
        }
      } catch {
        /* retain visible workspace; saving reports connectivity errors */
      } finally {
        refreshRunning = false
      }
    }
    window.addEventListener('focus', refresh)
    const timer = setInterval(refresh, 30000)
    const leave = (e) => {
      if (dirty.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => {
      disposed = true
      queue.current?.stop()
      queue.current = null
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('beforeunload', leave)
    }
  }, [client, id, generation])

  useEffect(() => {
    if (!workspace || !host.current) return
    host.current.innerHTML = template
    const cleanup = mountWorkspace(host.current, workspace, (value) => {
      latest.current = value
      dirty.current = !!client
      try {
        const previous = readCache(id)
        writeCache(id, { state: value, revision: previous?.revision || 0, dirty: !!client })
      } catch {
        dirty.current = true
        setStatus('storage-error')
        return
      }
      if (client) queue.current?.push(value)
      else setStatus('local')
    })
    return cleanup
  }, [workspace, client, id])

  async function reloadSaved() {
    if (
      dirty.current &&
      !window.confirm(
        'Discard this device’s unsynced edits and load the saved workspace? Export a backup first if you want to keep these edits.',
      )
    )
      return
    localStorage.removeItem(storageKey(id))
    dirty.current = false
    setWorkspace(null)
    setGeneration((n) => n + 1)
  }
  const labels = {
    loading: 'Loading your workspace…',
    saving: 'Saving…',
    saved: 'Saved',
    local: 'Saved on this device',
    error: 'Unable to sync — edits kept on this device',
    conflict: 'Newer work was saved elsewhere — your edits are kept here',
    'storage-error': 'Device storage is full — export your work now',
  }
  return (
    <>
      <div className="release-status" role="region" aria-label="Workspace account and sync">
        <span role="status">{labels[status]}</span>
        {workspace && <button onClick={() => exportWorkspace(latest.current)}>Export backup</button>}
        {status === 'error' && workspace && <button onClick={() => queue.current?.retry()}>Retry save</button>}
        {(status === 'conflict' || (!workspace && error)) && (
          <button onClick={reloadSaved}>Load saved workspace</button>
        )}
        {onSignOut && (
          <button disabled={!['saved', 'local'].includes(status)} onClick={onSignOut}>
            Sign out
          </button>
        )}
      </div>
      {status === 'conflict' && (
        <p className="release-notice" role="alert">
          To avoid overwriting newer work, saving is paused. Export this device’s edits, then load the saved workspace
          and reconcile the differences.
        </p>
      )}
      {error && (
        <p className="release-notice" role="alert">
          {error} Your existing work has not been replaced.
        </p>
      )}
      <div ref={host} />
    </>
  )
}
