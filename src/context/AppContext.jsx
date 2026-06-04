import { createContext, useContext, useReducer, useEffect } from 'react'
import { DEFAULT_STATE } from '../data/defaults.js'
import { getMonthKey } from '../utils/formatters.js'

const AppContext = createContext(null)
const STORAGE_KEY = 'mapa-do-bolso-state'

function reducer(state, action) {
  switch (action.type) {

    case 'ADD_LANCAMENTO': {
      const novo = { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }
      const reserva = novo.tipo === 'investimento' ? state.reserva + novo.valor : state.reserva
      return { ...state, lancamentos: [...state.lancamentos, novo], reserva, nextId: state.nextId + 1 }
    }

    case 'DEL_LANCAMENTO': {
      const l = state.lancamentos.find((x) => x.id === action.id)
      const reserva = l?.tipo === 'investimento' ? Math.max(0, state.reserva - l.valor) : state.reserva
      return { ...state, lancamentos: state.lancamentos.filter((x) => x.id !== action.id), reserva }
    }

    case 'ADD_CONTA':
      return { ...state, contas: [...state.contas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1 }

    case 'EDIT_CONTA':
      return { ...state, contas: state.contas.map((c) => c.id === action.payload.id ? { ...c, ...action.payload } : c) }

    case 'DEL_CONTA':
      return { ...state, contas: state.contas.filter((c) => c.id !== action.id) }

    case 'ADD_TRANSFER':
      return {
        ...state,
        transferencias: [...state.transferencias, { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }],
        nextId: state.nextId + 1,
      }

    case 'DEL_TRANSFER':
      return { ...state, transferencias: state.transferencias.filter((t) => t.id !== action.id) }

    case 'ADD_FIXO':
      return { ...state, fixos: [...state.fixos, { ...action.payload, id: state.nextId, ativo: true }], nextId: state.nextId + 1 }

    case 'EDIT_FIXO':
      return { ...state, fixos: state.fixos.map((f) => f.id === action.payload.id ? { ...f, ...action.payload } : f) }

    case 'TOGGLE_FIXO':
      return { ...state, fixos: state.fixos.map((f) => f.id === action.id ? { ...f, ativo: !f.ativo } : f) }

    case 'DEL_FIXO':
      return { ...state, fixos: state.fixos.filter((f) => f.id !== action.id) }

    case 'ADD_PARCELA':
      return { ...state, parcelas: [...state.parcelas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1 }

    case 'EDIT_PARCELA':
      return { ...state, parcelas: state.parcelas.map((p) => p.id === action.payload.id ? { ...p, ...action.payload } : p) }

    case 'DEL_PARCELA':
      return { ...state, parcelas: state.parcelas.filter((p) => p.id !== action.id) }

    case 'ADD_META':
      return { ...state, metas: [...state.metas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1 }

    case 'DEL_META':
      return { ...state, metas: state.metas.filter((m) => m.id !== action.id) }

    case 'SET_INVEST':
      return { ...state, investType: action.investType, reserva: action.reserva ?? state.reserva }

    case 'SET_ORCAMENTO':
      return { ...state, orcamento: action.valor }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_STATE
    } catch {
      return DEFAULT_STATE
    }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
