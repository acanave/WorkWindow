import { useEffect, useMemo, useRef, useState } from 'react'
import AppHeader from './components/AppHeader'
import AuthScreen from './components/Auth/AuthScreen'
import MonthCalendar from './components/Calendar/MonthCalendar'
import KanbanBoard from './components/Kanban/KanbanBoard'
import DependencyPanel from './components/Kanban/DependencyPanel'
import PerformancePanel from './components/Insights/PerformancePanel'
import CardModal from './components/CardModal/CardModal'
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase'
import { fetchRemoteState, saveRemoteState } from './state/cloud'
import { loadState, parseImportedJson, downloadStateAsJson, saveState } from './state/persistence'
import { createInitialState } from './state/schema'
import { StoreProvider, useStore } from './state/store'
import { buildDependencyInsights } from './utils/dependencies'
import { buildPerformanceSnapshot } from './utils/metrics'
import { buildRiskByCardId } from './utils/risk'

function WorkWindowApp({ user, onSignOut }) {
  const { state, dispatch } = useStore()
  const [modal, setModal] = useState({ open: false, mode: 'create', cardId: null })
  const [syncStatus, setSyncStatus] = useState('saved')
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('workwindow:theme')
    return saved === 'dark' ? 'dark' : 'light'
  })
  const hasMountedRef = useRef(false)

  useEffect(() => {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    window.localStorage.setItem('workwindow:theme', theme)
  }, [theme])

  useEffect(() => {
    if (!user?.id) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSyncStatus('saving')

      try {
        await saveRemoteState(user.id, state)
        setSyncStatus('saved')
      } catch (error) {
        console.error(error)
        setSyncStatus('error')
      }
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [state, user?.id])

  const dependencyInsights = useMemo(() => buildDependencyInsights(state.cards), [state.cards])
  const unresolvedMap = dependencyInsights.unresolvedCountByCardId

  const riskByCardId = useMemo(() => buildRiskByCardId(state.cards), [state.cards])
  const performanceSnapshot = useMemo(() => buildPerformanceSnapshot(state.cards), [state.cards])

  const selectedCard = state.cards.find((card) => card.id === modal.cardId) || null

  const openCreate = () => setModal({ open: true, mode: 'create', cardId: null })
  const openEdit = (cardId) => setModal({ open: true, mode: 'edit', cardId })
  const closeModal = () => setModal({ open: false, mode: 'create', cardId: null })

  const createCard = (payload) => dispatch({ type: 'CARD_CREATE', payload })
  const updateCard = (id, patch) => dispatch({ type: 'CARD_UPDATE', payload: { id, patch } })
  const deleteCard = (id) => dispatch({ type: 'CARD_DELETE', payload: { id } })
  const moveCard = (id, status) => dispatch({ type: 'CARD_MOVE_STATUS', payload: { id, status } })
  const setSelectedDate = (date) => dispatch({ type: 'UI_SET_SELECTED_DATE', payload: { date } })

  const logProgress = (id, delta) => dispatch({ type: 'CARD_LOG_PROGRESS', payload: { id, delta } })

  const addDayBlock = (cardId, date) => {
    dispatch({ type: 'DAY_BLOCK_ADD', payload: { cardId, date, points: 1 } })
  }

  const addDayBlockOnSelectedDate = (cardId) => {
    addDayBlock(cardId, state.ui.selectedDate)
  }

  const updateDayBlock = (cardId, blockId, points) => {
    dispatch({ type: 'DAY_BLOCK_UPDATE', payload: { cardId, blockId, points } })
  }

  const deleteDayBlock = (cardId, blockId) => {
    dispatch({ type: 'DAY_BLOCK_DELETE', payload: { cardId, blockId } })
  }

  const handleExport = () => {
    downloadStateAsJson(state)
  }

  const handleImport = (text) => {
    try {
      const nextState = parseImportedJson(text)
      dispatch({ type: 'IMPORT_REPLACE_ALL', payload: { state: nextState } })
    } catch {
      window.alert('Import failed. Please use a valid WorkWindow export JSON file.')
    }
  }

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AppHeader
        onNewCard={openCreate}
        onExport={handleExport}
        onImport={handleImport}
        onSignOut={onSignOut}
        theme={theme}
        onToggleTheme={toggleTheme}
        userEmail={user.email}
        syncStatus={syncStatus}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <PerformancePanel snapshot={performanceSnapshot} />
          <KanbanBoard
            cards={state.cards}
            selectedDate={state.ui.selectedDate}
            unresolvedMap={unresolvedMap}
            chainDepthByCardId={dependencyInsights.chainDepthByCardId}
            hasCycleByCardId={dependencyInsights.hasCycleByCardId}
            riskByCardId={riskByCardId}
            onCreateCard={createCard}
            onOpenCard={openEdit}
            onMoveCard={moveCard}
            onLogProgress={logProgress}
            onPlanCardToSelectedDate={addDayBlockOnSelectedDate}
          />
          <DependencyPanel cards={state.cards} dependencyInsights={dependencyInsights} onOpenCard={openEdit} />
        </section>

        <section>
          <MonthCalendar
            cards={state.cards}
            riskByCardId={riskByCardId}
            selectedDate={state.ui.selectedDate}
            onSelectDate={setSelectedDate}
            onDropCard={addDayBlock}
            onUpdateBlock={updateDayBlock}
            onDeleteBlock={deleteDayBlock}
          />
        </section>
      </main>

      {modal.open && (
        <CardModal
          mode={modal.mode}
          card={selectedCard}
          allCards={state.cards}
          blockedBy={selectedCard ? dependencyInsights.blockedByByCardId[selectedCard.id] || [] : []}
          onClose={closeModal}
          onCreate={createCard}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onLogProgress={logProgress}
        />
      )}
    </div>
  )
}

function LoadingScreen({ message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl shadow-slate-950/40">
        <h1 className="text-2xl font-semibold tracking-tight">WorkWindow</h1>
        <p className="mt-3 text-sm text-slate-300">{message}</p>
      </div>
    </main>
  )
}

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

function useBootstrapState(user) {
  const [bootstrap, setBootstrap] = useState({
    errorMessage: '',
    state: createInitialState(),
    status: user ? 'loading' : 'idle',
  })

  useEffect(() => {
    if (!user?.id) {
      setBootstrap({
        errorMessage: '',
        state: createInitialState(),
        status: 'idle',
      })
      return
    }

    let cancelled = false

    async function bootstrapState() {
      setBootstrap({
        errorMessage: '',
        state: createInitialState(),
        status: 'loading',
      })

      try {
        const localState = loadState()
        const remoteState = await fetchRemoteState()
        if (cancelled) return

        if (remoteState) {
          saveState(remoteState)
          setBootstrap({
            errorMessage: '',
            state: remoteState,
            status: 'ready',
          })
          return
        }

        const initialState = localState || createInitialState()
        await saveRemoteState(user.id, initialState)
        if (cancelled) return

        saveState(initialState)
        setBootstrap({
          errorMessage: '',
          state: initialState,
          status: 'ready',
        })
      } catch (error) {
        if (cancelled) return
        setBootstrap({
          errorMessage: error.message || 'Unable to load your secure workspace.',
          state: createInitialState(),
          status: 'error',
        })
      }
    }

    bootstrapState()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return bootstrap
}

function SecureApp() {
  const { errorMessage, status, user } = useSupabaseSession()
  const bootstrap = useBootstrapState(user)

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error(error)
    }
  }

  if (status === 'config' || status === 'error') {
    return <AuthScreen errorMessage={errorMessage} />
  }

  if (status === 'loading') {
    return <LoadingScreen message="Checking your secure session..." />
  }

  if (!user) {
    return <AuthScreen />
  }

  if (bootstrap.status === 'loading') {
    return <LoadingScreen message="Loading your secure workspace..." />
  }

  if (bootstrap.status === 'error') {
    return <AuthScreen errorMessage={bootstrap.errorMessage} />
  }

  return (
    <StoreProvider key={user.id} initialState={bootstrap.state}>
      <WorkWindowApp user={user} onSignOut={handleSignOut} />
    </StoreProvider>
  )
}

export default function App() {
  return <SecureApp />
}
