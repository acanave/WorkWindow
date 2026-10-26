import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
vi.mock('./redesign/Workspace', () => ({ default: () => <main>Redesigned workspace</main> }))
vi.mock('./lib/supabase', () => ({ isSupabaseConfigured: () => false, getSupabaseClient: vi.fn() }))
import App from './App'
afterEach(cleanup)
describe('redesigned launch', () => {
  it('opens the redesigned workspace when running locally', () => {
    render(<App />)
    expect(screen.getByText('Redesigned workspace')).toBeInTheDocument()
  })
})
