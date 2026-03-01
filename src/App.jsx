import { useEffect, useMemo, useState } from 'react'
import AppHeader from './components/AppHeader'
import MonthCalendar from './components/Calendar/MonthCalendar'
import KanbanBoard from './components/Kanban/KanbanBoard'
import DependencyPanel from './components/Kanban/DependencyPanel'
import CardModal from './components/CardModal/CardModal'
import { parseImportedJson, downloadStateAsJson } from './state/persistence'
import { StoreProvider, useStore } from './state/store'
import { buildDependencyInsights } from './utils/dependencies'
import { buildRiskByCardId } from './utils/risk'

function WorkWindowApp() {
  const { state, dispatch } = useStore()
  const [modal, setModal] = useState({ open: false, mode: 'create', cardId: null })
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('workwindow:theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    window.localStorage.setItem('workwindow:theme', theme)
  }, [theme])

  const dependencyInsights = useMemo(() => buildDependencyInsights(state.cards), [state.cards])
  const unresolvedMap = dependencyInsights.unresolvedCountByCardId

  const riskByCardId = useMemo(() => buildRiskByCardId(state.cards), [state.cards])

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
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <KanbanBoard
            cards={state.cards}
            unresolvedMap={unresolvedMap}
            chainDepthByCardId={dependencyInsights.chainDepthByCardId}
            hasCycleByCardId={dependencyInsights.hasCycleByCardId}
            riskByCardId={riskByCardId}
            onCreateCard={createCard}
            onOpenCard={openEdit}
            onMoveCard={moveCard}
            onLogProgress={logProgress}
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

export default function App() {
  return (
    <StoreProvider>
      <WorkWindowApp />
    </StoreProvider>
  )
}
