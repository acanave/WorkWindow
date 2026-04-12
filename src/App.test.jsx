import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const originalSupabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

async function renderApp() {
  vi.resetModules()
  const { default: App } = await import('./App')
  return render(<App />)
}

describe('App public launch modes', () => {
  beforeEach(() => {
    localStorage.clear()
    delete import.meta.env.VITE_SUPABASE_URL
    delete import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()

    if (originalSupabaseUrl) {
      import.meta.env.VITE_SUPABASE_URL = originalSupabaseUrl
    } else {
      delete import.meta.env.VITE_SUPABASE_URL
    }

    if (originalSupabaseKey) {
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalSupabaseKey
    } else {
      delete import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    }
  })

  it('shows the launch mode chooser when cloud sync is not configured', async () => {
    await renderApp()

    expect(screen.getByRole('heading', { level: 1, name: 'WorkWindow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open local mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view cloud setup/i })).toBeInTheDocument()
  })

  it('opens the local-first app from the chooser', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: /open local mode/i }))

    expect(screen.getByText('Local-first mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cloud setup/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new card/i })).toBeInTheDocument()
  })

  it('shows the cloud setup guide from the chooser', async () => {
    const user = userEvent.setup()
    await renderApp()

    await user.click(screen.getByRole('button', { name: /view cloud setup/i }))

    expect(screen.getByRole('heading', { level: 1, name: /bring your own supabase project/i })).toBeInTheDocument()
    expect(screen.getByText(/VITE_SUPABASE_URL/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open local mode/i })).toBeInTheDocument()
  })
})
