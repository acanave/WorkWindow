import { useState } from 'react'
import { getSupabaseConfigError, getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase'

export default function AuthScreen({ errorMessage }) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')

  const configError = getSupabaseConfigError()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isSupabaseConfigured()) return

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return

    setPending(true)
    setNotice('')

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) throw error

      setNotice('Magic link sent. Open it on this device to finish signing in.')
    } catch (error) {
      setNotice(error.message || 'Unable to send sign-in email.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f1421] px-4 py-10 text-[#edf4ff]">
      <section className="w-full max-w-md rounded-2xl border border-[#2b384d] bg-[#172031] p-6 shadow-2xl shadow-slate-950/25">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Secure Sync</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">WorkWindow</h1>
        <p className="mt-3 text-sm leading-6 text-[#c8d3e3]">
          Sign in with a magic link to sync your workspace across devices using your own Supabase project.
        </p>

        {configError && (
          <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-medium">Configuration required</p>
            <p className="mt-2">{configError}</p>
            <p className="mt-2">
              Use only the Supabase publishable key here. Never put the service role key in Vite env vars.
            </p>
          </div>
        )}

        {!configError && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="mb-2 block text-[#c8d3e3]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-[#2b384d] bg-[#111a2a] px-4 py-3 text-[#edf4ff] outline-none transition focus:border-cyan-400"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-300/70"
            >
              {pending ? 'Sending link...' : 'Email Me a Magic Link'}
            </button>
          </form>
        )}

        {(errorMessage || notice) && (
          <div className="mt-4 rounded-xl border border-[#2b384d] bg-[#111a2a] p-4 text-sm text-[#c8d3e3]">
            {errorMessage || notice}
          </div>
        )}
      </section>
    </main>
  )
}
