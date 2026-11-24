import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ApprovalScreen from './ApprovalScreen'

const id = '11111111-1111-4111-8111-111111111111'
const user = { id: 'fake-owner' }
function fixture(overrides = {}) {
  return {
    proposal: {
      schemaVersion: 1,
      id,
      ownerId: user.id,
      projectId: 'project-1',
      projectTitle: 'Fake project',
      source: 'workItems',
      operation: 'create',
      taskId: 'task-1',
      before: null,
      after: {
        id: 'task-1',
        project: 'Fake project',
        title: '<img src=x onerror=alert(1)>',
        description: 'Fake details',
        status: 'Backlog',
      },
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    },
    digest: 'a'.repeat(64),
    status: 'pending',
    ...overrides,
  }
}
function clientFor(read, decision = { data: { id, status: 'committed' }, error: null }) {
  return {
    rpc: vi.fn((_name, { action }) => ({
      abortSignal: () => Promise.resolve(action === 'read' ? { data: read, error: null } : decision),
    })),
  }
}
afterEach(cleanup)
describe('task proposal review', () => {
  it('reads without writing, renders untrusted text, and submits only displayed id/digest', async () => {
    const client = clientFor(fixture())
    const { container } = render(<ApprovalScreen client={client} user={user} proposalId={id} />)
    await screen.findByText('Fake project')
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(client.rpc).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Approve exact changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve exact changes' }))
    await screen.findByText('Task change saved. This proposal cannot write again.')
    expect(client.rpc).toHaveBeenCalledTimes(2)
    expect(client.rpc).toHaveBeenLastCalledWith('workwindow_task_approval', {
      action: 'approve',
      body: { id, digest: 'a'.repeat(64) },
    })
  })
  it('blocks approval after a stale error while still allowing cancellation', async () => {
    const client = clientFor(fixture(), { data: null, error: { message: 'stale_proposal' } })
    render(<ApprovalScreen client={client} user={user} proposalId={id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve exact changes' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Approve exact changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel proposal' })).toBeEnabled()
    expect(client.rpc).toHaveBeenCalledTimes(2)
  })
  it('uncertain outcome offers status checking without an automatic write retry', async () => {
    const client = clientFor(fixture(), { data: null, error: { message: 'private server detail' } })
    render(<ApprovalScreen client={client} user={user} proposalId={id} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve exact changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('result is uncertain')
    expect(screen.queryByText('private server detail')).not.toBeInTheDocument()
    expect(client.rpc).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Approve exact changes' })).toBeDisabled()
  })
  it('expired proposals cannot be approved', async () => {
    const data = fixture()
    data.proposal.expiresAt = new Date(Date.now() - 1000).toISOString()
    render(<ApprovalScreen client={clientFor(data)} user={user} proposalId={id} />)
    await screen.findByText('Proposal expired. Ask the assistant for a new proposal.')
    expect(screen.queryByRole('button', { name: 'Approve exact changes' })).not.toBeInTheDocument()
  })
  it('rejects a proposal returned for a different owner', async () => {
    const data = fixture()
    data.proposal.ownerId = 'other-owner'
    render(<ApprovalScreen client={clientFor(data)} user={user} proposalId={id} />)
    await screen.findByRole('alert')
    expect(screen.queryByText('Fake project')).not.toBeInTheDocument()
  })
  it('ignores late responses when the review is replaced', async () => {
    let finish
    const client = {
      rpc: vi.fn(() => ({
        abortSignal: () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      })),
    }
    const rendered = render(<ApprovalScreen client={client} user={user} proposalId={id} />)
    rendered.unmount()
    finish({ data: fixture(), error: null })
    await waitFor(() => expect(screen.queryByText('Fake project')).not.toBeInTheDocument())
  })
})
