import { useEffect, useRef, useState } from 'react'
import './approval.css'

const messages = {
  stale_proposal: 'Your workspace changed. Cancel this proposal and ask the assistant for a new one to review.',
  proposal_changed: 'This proposal no longer matches. Ask the assistant for a new proposal.',
  proposal_not_pending: 'This proposal has expired or was cancelled. Check its status before continuing.',
  integration_disabled: 'Task approvals are unavailable. No new approval can be submitted.',
  access_denied: 'This proposal is not available to this account.',
  owner_confirmation_required: 'Sign in with the WorkWindow owner account to review this proposal.',
  grant_changed: 'Project access changed. Ask the assistant for a new proposal.',
  daily_write_limit: 'The daily task-change limit has been reached. No change was made.',
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validRecord(data, id, ownerId) {
  const p = data?.proposal
  return (
    p?.schemaVersion === 1 &&
    p.id === id &&
    p.ownerId === ownerId &&
    p.source === 'workItems' &&
    ['create', 'update'].includes(p.operation) &&
    ['pending', 'committed', 'cancelled', 'expired'].includes(data.status) &&
    /^[0-9a-f]{64}$/.test(data.digest) &&
    typeof p.projectId === 'string' &&
    typeof p.projectTitle === 'string' &&
    typeof p.taskId === 'string' &&
    Number.isFinite(Date.parse(p.expiresAt)) &&
    p.after?.id === p.taskId &&
    p.after?.project === p.projectTitle &&
    typeof p.after?.title === 'string' &&
    typeof p.after?.description === 'string' &&
    typeof p.after?.status === 'string' &&
    (p.operation === 'create' ? p.before === null : p.before?.id === p.taskId)
  )
}

export default function ApprovalScreen({ client, user, proposalId, onSignOut }) {
  const [record, setRecord] = useState(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)
  const [reload, setReload] = useState(0)
  const lock = useRef(false)
  const active = useRef(null)
  const generation = useRef(0)

  useEffect(() => {
    const current = ++generation.current
    const controller = new AbortController()
    active.current = controller
    lock.current = true
    setBusy(true)
    setRecord(null)
    setProblem('')
    const timer = setTimeout(() => controller.abort(), 15000)
    async function load() {
      try {
        if (!uuid.test(proposalId)) throw new Error('invalid_proposal')
        const { data, error } = await client
          .rpc('workwindow_task_approval', { action: 'read', body: { id: proposalId } })
          .abortSignal(controller.signal)
        if (error) throw error
        if (!validRecord(data, proposalId, user.id)) throw new Error('invalid_proposal')
        if (generation.current === current) setRecord(data)
      } catch (error) {
        if (generation.current === current)
          setProblem(messages[error.message] || 'Unable to load this proposal. Check your sign-in and try again.')
      } finally {
        clearTimeout(timer)
        if (generation.current === current) {
          lock.current = false
          setBusy(false)
        }
      }
    }
    load()
    return () => {
      generation.current = current + 1
      controller.abort()
      active.current?.abort()
    }
  }, [client, user.id, proposalId, reload])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function decide(action) {
    if (lock.current || !record || record.status !== 'pending') return
    if (Date.now() >= Date.parse(record.proposal.expiresAt)) return
    lock.current = true
    setBusy(true)
    setProblem('')
    const current = generation.current
    const controller = new AbortController()
    active.current = controller
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const { data, error } = await client
        .rpc('workwindow_task_approval', {
          action,
          body: { id: record.proposal.id, digest: record.digest },
        })
        .abortSignal(controller.signal)
      if (error) throw error
      if (data?.id !== record.proposal.id || !['committed', 'cancelled'].includes(data.status))
        throw new Error('invalid_receipt')
      if (generation.current === current) setRecord({ ...record, status: data.status, receipt: data })
    } catch (error) {
      if (generation.current === current)
        setProblem(
          messages[error.message] ||
            'The result is uncertain. Check status before trying again; do not create another proposal.',
        )
    } finally {
      clearTimeout(timer)
      if (generation.current === current) {
        lock.current = false
        setBusy(false)
      }
    }
  }

  const p = record?.proposal
  const expired = record?.status === 'expired' || (p && now >= Date.parse(p.expiresAt))
  const pending = record?.status === 'pending'
  return (
    <main className="approval-page">
      <section className="approval-card" aria-labelledby="approval-heading">
        <p className="approval-brand">WorkWindow</p>
        <h1 id="approval-heading">Review task change</h1>
        <p>Nothing changes until you approve the exact proposal below.</p>
        {busy && <p role="status">Checking…</p>}
        {problem && <p role="alert">{problem}</p>}
        {p && (
          <>
            <h2>{p.operation === 'create' ? 'Create task' : 'Update task'}</h2>
            <dl className="approval-details">
              <dt>Project</dt>
              <dd>{p.projectTitle}</dd>
              <dt>Project ID</dt>
              <dd>{p.projectId}</dd>
              <dt>Task ID</dt>
              <dd>{p.taskId}</dd>
              <dt>Review expires</dt>
              <dd>{new Date(p.expiresAt).toLocaleString()}</dd>
            </dl>
            <div className="approval-table-wrap">
              <table>
                <caption>Exact proposed changes</caption>
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Before</th>
                    <th scope="col">After</th>
                  </tr>
                </thead>
                <tbody>
                  {['title', 'description', 'status'].map((field) => (
                    <tr key={field}>
                      <th scope="row">{field[0].toUpperCase() + field.slice(1)}</th>
                      <td>{p.before ? p.before[field] || '(empty)' : '(new task)'}</td>
                      <td>{p.after[field] || '(empty)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p role="status">
              {record.status === 'committed'
                ? 'Task change saved. This proposal cannot write again.'
                : record.status === 'cancelled'
                  ? 'Proposal cancelled. No task change was made.'
                  : expired
                    ? 'Proposal expired. Ask the assistant for a new proposal.'
                    : 'Awaiting your approval.'}
            </p>
            {pending && !expired && (
              <div className="approval-actions">
                <button disabled={busy || !!problem} onClick={() => decide('approve')}>
                  Approve exact changes
                </button>
                <button disabled={busy} onClick={() => decide('cancel')}>
                  Cancel proposal
                </button>
              </div>
            )}
          </>
        )}
        <div className="approval-actions">
          <button disabled={busy} onClick={() => setReload((value) => value + 1)}>
            Check status
          </button>
          <a href="/">Back to workspace</a>
          {onSignOut && (
            <button disabled={busy} onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
