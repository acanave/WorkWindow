import { describe, it, expect, vi } from 'vitest'
import { createSaveQueue, ConflictError, workspaceRepository } from './cloud'
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
describe('conflict-safe saves', () => {
  it('serializes rapid edits and uses the new revision for the next write', async () => {
    let resolve
    const repository = {
      save: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((r) => {
              resolve = r
            }),
        )
        .mockResolvedValueOnce(8),
    }
    const saved = vi.fn(),
      status = vi.fn()
    const queue = createSaveQueue(repository, 6, { saved, status })
    queue.push({ n: 1 })
    queue.push({ n: 2 })
    queue.push({ n: 3 })
    expect(repository.save).toHaveBeenCalledTimes(1)
    resolve(7)
    await tick()
    expect(repository.save).toHaveBeenNthCalledWith(2, { n: 3 }, 7)
    expect(saved).toHaveBeenLastCalledWith({ n: 3 }, 8)
    expect(status).toHaveBeenLastCalledWith('saved')
  })
  it('stops on conflict and retains subsequent local edits', async () => {
    const repository = { save: vi.fn().mockRejectedValue(new ConflictError()) },
      status = vi.fn()
    const queue = createSaveQueue(repository, 1, { saved: vi.fn(), status })
    queue.push({ n: 1 })
    await tick()
    queue.push({ n: 2 })
    await tick()
    expect(repository.save).toHaveBeenCalledTimes(1)
    expect(status).toHaveBeenLastCalledWith('conflict')
  })
  it('retries a network failure without incrementing its expected revision', async () => {
    const repository = { save: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2) }
    const queue = createSaveQueue(repository, 1, { saved: vi.fn(), status: vi.fn() })
    queue.push({ n: 1 })
    await tick()
    await queue.retry()
    expect(repository.save).toHaveBeenLastCalledWith({ n: 1 }, 1)
  })
  it('requires the expected revision and treats zero updated rows as a conflict', async () => {
    const query = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const update = vi.fn(() => query),
      client = { from: vi.fn(() => ({ update })) }
    await expect(workspaceRepository(client, 'owner').save({ x: 1 }, 3)).rejects.toBeInstanceOf(ConflictError)
    expect(query.eq).toHaveBeenCalledWith('revision', 3)
    expect(query.eq).toHaveBeenCalledWith('user_id', 'owner')
  })
})
