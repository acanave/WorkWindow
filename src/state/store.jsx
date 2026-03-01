import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { createId } from '../utils/id'
import { formatDateKey } from '../utils/date'
import { createDefaultCard, createInitialState, normalizeState } from './schema'
import { loadState, saveState } from './persistence'

const StoreContext = createContext(null)

export function reducer(state, action) {
  switch (action.type) {
    case 'CARD_CREATE': {
      const nextCard = createDefaultCard({ ...action.payload, id: createId('c') })
      return {
        ...state,
        cards: [nextCard, ...state.cards],
      }
    }
    case 'CARD_UPDATE': {
      const { id, patch } = action.payload
      return normalizeState({
        ...state,
        cards: state.cards.map((card) => (card.id === id ? { ...card, ...patch } : card)),
      })
    }
    case 'CARD_DELETE': {
      const id = action.payload.id
      const remaining = state.cards.filter((card) => card.id !== id)
      return normalizeState({ ...state, cards: remaining })
    }
    case 'CARD_MOVE_STATUS': {
      const { id, status } = action.payload
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (card.id !== id) return card
          if (status === 'Done' && card.completed_points < card.estimate_points) return card
          return { ...card, status }
        }),
      }
    }
    case 'DAY_BLOCK_ADD': {
      const { cardId, date, points = 1 } = action.payload
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (card.id !== cardId) return card
          return {
            ...card,
            planned_day_blocks: [
              ...card.planned_day_blocks,
              { id: createId('b'), date, points: clampPoints(points) },
            ],
          }
        }),
      }
    }
    case 'DAY_BLOCK_UPDATE': {
      const { cardId, blockId, points } = action.payload
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (card.id !== cardId) return card
          return {
            ...card,
            planned_day_blocks: card.planned_day_blocks.map((block) =>
              block.id === blockId ? { ...block, points: clampPoints(points) } : block,
            ),
          }
        }),
      }
    }
    case 'DAY_BLOCK_DELETE': {
      const { cardId, blockId } = action.payload
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (card.id !== cardId) return card
          return {
            ...card,
            planned_day_blocks: card.planned_day_blocks.filter((block) => block.id !== blockId),
          }
        }),
      }
    }
    case 'CARD_LOG_PROGRESS': {
      const { id, delta } = action.payload
      return {
        ...state,
        cards: state.cards.map((card) => {
          if (card.id !== id) return card
          const previousCompleted = card.completed_points
          const completed = clamp(card.completed_points + delta, 0, card.estimate_points)
          const appliedDelta = completed - previousCompleted
          const status = completed >= card.estimate_points ? 'Done' : card.status === 'Done' ? 'In Progress' : card.status
          const progressLog = Array.isArray(card.progress_log) ? card.progress_log : []
          const nextProgressLog =
            appliedDelta === 0
              ? progressLog
              : [
                  ...progressLog,
                  { id: createId('p'), date: formatDateKey(new Date()), delta: appliedDelta },
                ]
          return {
            ...card,
            completed_points: completed,
            status,
            progress_log: nextProgressLog,
          }
        }),
      }
    }
    case 'UI_SET_SELECTED_DATE': {
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedDate: action.payload.date,
        },
      }
    }
    case 'IMPORT_REPLACE_ALL': {
      return normalizeState(action.payload.state)
    }
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initializeState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function clampPoints(points) {
  return clamp(Number.parseInt(points, 10) || 1, 1, 8)
}

function initializeState() {
  return loadState() || createInitialState()
}
