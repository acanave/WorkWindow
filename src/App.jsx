import { useEffect, useState } from 'react'
import AuthScreen from './components/Auth/AuthScreen'
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase'
import Workspace from './redesign/Workspace'

function useSupabaseSession() {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState(isSupabaseConfigured() ? 'loading' : 'config')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const supabase = getSupabaseClient()
    let cancelled = false

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()
      if (cancelled) return

      if (error) {
        setErrorMessage(error.message)
        setStatus('error')
        return
      }

      setSession(data.session)
      setStatus('ready')
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      setStatus('ready')
      setErrorMessage('')
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return {
    errorMessage,
    session,
    status,
    user: session?.user || null,
  }
}

export default function App() {
  const { errorMessage, status, user } = useSupabaseSession()
  if (!isSupabaseConfigured()) return <Workspace />
  if (status === 'loading') return <main className="release-notice">Checking your sign-in…</main>
  if (!user) return <AuthScreen errorMessage={errorMessage} />
  const client = getSupabaseClient()
  return <Workspace key={user.id} client={client} user={user} onSignOut={() => client.auth.signOut()} />
}
