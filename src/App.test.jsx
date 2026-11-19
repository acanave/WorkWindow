import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('./redesign/Workspace', () => ({ default: () => <main>Redesigned workspace</main> }))
vi.mock('./lib/supabase', () => ({ isSupabaseConfigured: () => false, getSupabaseClient: vi.fn() }))
import App from './App'
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  window.history.replaceState({}, '', '/')
})
describe('redesigned launch', () => {
  it('ignores approval links while the feature is disabled', () => {
    vi.stubEnv('VITE_WORKWINDOW_APPROVALS', '')
    window.history.replaceState({}, '', '/?approval=11111111-1111-4111-8111-111111111111')
    render(<App />)
    expect(screen.getByText('Redesigned workspace')).toBeInTheDocument()
  })
  it('fails closed for approval links without configured authentication', () => {
    vi.stubEnv('VITE_WORKWINDOW_APPROVALS', 'true')
    window.history.replaceState({}, '', '/?approval=11111111-1111-4111-8111-111111111111')
    render(<App />)
    expect(screen.getByText('Task approvals are unavailable.')).toBeInTheDocument()
  })
  it('opens the redesigned workspace when running locally', () => {
    render(<App />)
    expect(screen.getByText('Redesigned workspace')).toBeInTheDocument()
  })
})
