import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { DEFAULT_STATE } from '../data/defaults.js'
import { getMonthKey } from '../utils/formatters.js'
import {
  loadAllData,
  saveLancamentos, saveFixos, saveParcelas,
  saveContas, saveTransferencias, saveMetas,
} from '../services/sheets.js'
import { isLoggedIn } from '../services/auth.js'

const AppContext  = createContext(null)
const STORAGE_KEY = 'mapa-do-bolso-state'

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': return { ...state, ...action.payload, _loaded: true }

    case 'ADD_LANCAMENTO': {
      const novo = { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }
      const reserva = novo.tipo === 'investimento' ? state.reserva + novo.valor : state.reserva
      return { ...state, lancamentos: [...state.lancamentos, novo], reserva, nextId: state.nextId + 1 }
    }
    case 'DEL_LANCAMENTO': {
      const l = state.lancamentos.find(x => x.id === action.id)
      const reserva = l?.tipo === 'investimento' ? Math.max(0, state.reserva - l.valor) : state.reserva
      return { ...state, lancamentos: state.lancamentos.filter(x => x.id !== action.id), reserva }
    }
    case 'ADD_CONTA':
      return { ...state, contas: [...state.contas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1 }
    case 'EDIT_CONTA':
      return { ...state, contas: state.contas.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }
    case 'DEL_CONTA':
      return { ...state, contas: state.contas.filter(c => c.id !== action.id) }
    case 'ADD_TRANSFER':
      return { ...state, transferencias: [...state.transferencias, { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }], nextId: state.nextId + 1 }
    case 'DEL_TRANSFER':
      return { ...state, transferencias: state.transferencias.filter(t => t.id !== action.id) }
    case 'ADD_FIXO':
      return { ...state, fixos: [...state.fixos, { ...action.payload, id: state.nextId, ativo: true }], nextId: state.nextId + 1 }
    case 'EDIT_FIXO':
      return { ...state, fixos: state.fixos.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) }
    case 'TOGGLE_FIXO':
      return { ...state, fixos: state.fixos.map(f => f.id === action.id ? { ...f, ativo: !f.ativo } : f) }
    case 'DEL_FIXO':
      return { ...state, fixos: state.fixos.filter(f => f.id !== action.id) }
    case 'ADD_PARCELA':
      return { ...state, parcelas: [...state.parcelas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1 }
    case 'EDIT_PARCELA':
      return { ...state, parcelas: state.parcelas.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }
    case 'DEL_PARCELA':
      return { ...state, parcelas: state.parcelas.filter(p => p.id !== action.id) }
    case 'ADD_META':
      return { ...state, metas: [...state.metas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1 }
    case 'DEL_META':
      return { ...state, metas: state.metas.filter(m => m.id !== action.id) }
    case 'SET_INVEST':
      return { ...state, investType: action.investType, reserva: action.reserva ?? state.reserva }
    case 'SET_ORCAMENTO':
      return { ...state, orcamento: action.valor }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { ...DEFAULT_STATE, _loaded: false })
  const syncTimer = useRef(null)

  // Carrega dados do Sheets ou localStorage
  useEffect(() => {
    const load = async () => {
      if (isLoggedIn()) {
        try {
          const data = await loadAllData()
          // Calcula nextId a partir dos dados carregados
          const allIds = [
            ...data.lancamentos.map(l => parseInt(l.id) || 0),
            ...data.fixos.map(f => f.id || 0),
            ...data.parcelas.map(p => p.id || 0),
            ...data.contas.map(c => c.id || 0),
            ...data.transferencias.map(t => parseInt(t.id) || 0),
            ...data.metas.map(m => m.id || 0),
          ]
          const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 100
          // Se não há contas no Sheets, importa os defaults
          if (data.contas.length === 0) data.contas = DEFAULT_STATE.contas
          if (data.fixos.length === 0)  data.fixos  = DEFAULT_STATE.fixos
          if (data.parcelas.length === 0) data.parcelas = DEFAULT_STATE.parcelas
          dispatch({ type: 'LOAD', payload: { ...data, nextId } })
          return
        } catch (e) {
          console.warn('Sheets load failed, usando localStorage:', e)
        }
      }
      // Fallback: localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) dispatch({ type: 'LOAD', payload: JSON.parse(saved) })
        else dispatch({ type: 'LOAD', payload: {} })
      } catch {
        dispatch({ type: 'LOAD', payload: {} })
      }
    }
    load()
  }, [])

  // Sync com Sheets com debounce de 2s
  useEffect(() => {
    if (!state._loaded) return
    // Salva no localStorage sempre
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
    // Sync com Sheets se logado
    if (!isLoggedIn()) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      try {
        await Promise.all([
          saveLancamentos(state.lancamentos),
          saveFixos(state.fixos),
          saveParcelas(state.parcelas),
          saveContas(state.contas),
          saveTransferencias(state.transferencias),
          saveMetas(state.metas),
        ])
      } catch (e) {
        console.warn('Sheets sync failed:', e)
      }
    }, 2000)
  }, [state])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
