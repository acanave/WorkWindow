import { useEffect, useMemo, useState } from 'react'
import { getSupabaseConfigError, getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase'
import { formatMagicLinkError } from './authErrors'

const MAGIC_LINK_COOLDOWN_MS = 60_000
const MAGIC_LINK_COOLDOWN_KEY = 'workwindow:magic-link-cooldown-until'

function getStoredCooldownUntil() {
  try {
    const value = Number.parseInt(window.localStorage.getItem(MAGIC_LINK_COOLDOWN_KEY) || '', 10)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function setStoredCooldownUntil(until) {
  try {
    if (until > Date.now()) {
      window.localStorage.setItem(MAGIC_LINK_COOLDOWN_KEY, String(until))
    } else {
      window.localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY)
    }
  } catch {
    // ignore localStorage write failures
  }
}

export default function AuthScreen({ errorMessage }) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(() => getStoredCooldownUntil())
  const [now, setNow] = useState(() => Date.now())

  const configError = getSupabaseConfigError()
  const cooldownRemainingSeconds = useMemo(() => {
    const remaining = Math.ceil((cooldownUntil - now) / 1000)
    return Math.max(0, remaining)
  }, [cooldownUntil, now])

  useEffect(() => {
    if (!cooldownUntil) return

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [cooldownUntil])

  useEffect(() => {
    if (cooldownUntil && cooldownUntil <= Date.now()) {
      setCooldownUntil(0)
      setStoredCooldownUntil(0)
    }
  }, [cooldownUntil, now])

  const beginCooldown = () => {
    const until = Date.now() + MAGIC_LINK_COOLDOWN_MS
    setCooldownUntil(until)
    setStoredCooldownUntil(until)
    setNow(Date.now())
    return until
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isSupabaseConfigured()) return
    if (cooldownRemainingSeconds > 0) {
      setNotice(`Please wait ${cooldownRemainingSeconds}s before requesting another magic link.`)
      return
    }

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

      beginCooldown()
      setNotice(
        'Magic link sent. Open it on this device to finish signing in. You can request another link in 60 seconds.',
      )
    } catch (error) {
      const nextMessage = formatMagicLinkError(error)
      setNotice(nextMessage)

      const code = String(error?.code || '').toLowerCase()
      const message = String(error?.message || '').toLowerCase()
      if (
        code === 'over_email_send_rate_limit' ||
        code === 'over_request_rate_limit' ||
        code === 'rate_limit_exceeded' ||
        message.includes('rate exceeded')
      ) {
        beginCooldown()
      }
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
              disabled={pending || cooldownRemainingSeconds > 0}
              className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-300/70"
            >
              {pending
                ? 'Sending link...'
                : cooldownRemainingSeconds > 0
                  ? `Wait ${cooldownRemainingSeconds}s`
                  : 'Email Me a Magic Link'}
            </button>
          </form>
        )}

        {(errorMessage || notice) && (
          <div className="mt-4 rounded-xl border border-[#2b384d] bg-[#111a2a] p-4 text-sm text-[#c8d3e3]">
            {errorMessage || notice}
          </div>
        )}

        {!configError && (
          <p className="mt-4 text-xs leading-5 text-[#8795aa]">
            If a magic link sends you back here, check that the exact deployed URL is allowed in Supabase Redirect URLs
            and open the link in the same browser or device that requested it. If Supabase shows an auth hook error,
            inspect the Before User Created hook or email allowlist in the dashboard. The button is rate-limited to one
            request per 60 seconds to match Supabase.
          </p>
        )}
      </section>
    </main>
  )
}
