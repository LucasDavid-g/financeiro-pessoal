import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { saveUserData, loadUserData } from '../services/firebase.js'
import { getCurrentUser } from '../services/firebase.js'

const AppContext = createContext(null)
const STORAGE_KEY = 'mapa-do-bolso-state'

const SYNC_ACTIONS = new Set([
  'ADD_LANCAMENTO', 'DEL_LANCAMENTO',
  'ADD_CONTA', 'EDIT_CONTA', 'DEL_CONTA',
  'ADD_TRANSFER', 'DEL_TRANSFER',
  'ADD_FIXO', 'EDIT_FIXO', 'TOGGLE_FIXO', 'DEL_FIXO',
  'ADD_PARCELA', 'EDIT_PARCELA', 'DEL_PARCELA',
  'ADD_META', 'DEL_META',
])

const EMPTY = {
  lancamentos: [], fixos: [], parcelas: [], contas: [],
  transferencias: [], metas: [], reserva: 0,
  investType: 'CDI (cofrinho)', orcamento: null, nextId: 100,
  _loaded: false, _lastAction: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...EMPTY, ...action.payload, _loaded: true, _lastAction: null }

    case 'ADD_LANCAMENTO': {
      const novo = { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }
      const reserva = novo.tipo === 'investimento' ? state.reserva + novo.valor : state.reserva
      return { ...state, lancamentos: [...state.lancamentos, novo], reserva, nextId: state.nextId + 1, _lastAction: action.type }
    }
    case 'DEL_LANCAMENTO': {
      const l = state.lancamentos.find(x => x.id === action.id)
      const reserva = l?.tipo === 'investimento' ? Math.max(0, state.reserva - l.valor) : state.reserva
      return { ...state, lancamentos: state.lancamentos.filter(x => x.id !== action.id), reserva, _lastAction: action.type }
    }
    case 'ADD_CONTA':
      return { ...state, contas: [...state.contas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_CONTA':
      return { ...state, contas: state.contas.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c), _lastAction: action.type }
    case 'DEL_CONTA': {
      const id = action.id
      const novasLancs = state.lancamentos.filter(l => l.contaId !== id)
      const novasTransfers = state.transferencias.filter(t => t.origemId !== id && t.destinoId !== id)
      const novosFixos = state.fixos.map(f => f.contaId === id ? { ...f, contaId: null } : f)
      const investsRemovidos = state.lancamentos.filter(l => l.contaId === id && l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
      return { ...state, contas: state.contas.filter(c => c.id !== id), lancamentos: novasLancs, transferencias: novasTransfers, fixos: novosFixos, reserva: Math.max(0, state.reserva - investsRemovidos), _lastAction: action.type }
    }
    case 'PAGAR_COMPROMISSO': {
      // Marca despesa pendente como paga e desconta do saldo
      const lanc = state.lancamentos.find(x => x.id === action.id)
      if (!lanc || lanc.status !== 'pendente') return state
      const updated = state.lancamentos.map(l =>
        l.id === action.id ? { ...l, status: 'pago', contaId: action.contaId || l.contaId } : l
      )
      return { ...state, lancamentos: updated, _lastAction: action.type }
    }
        case 'ADD_TRANSFER':
      return { ...state, transferencias: [...state.transferencias, { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'DEL_TRANSFER':
      return { ...state, transferencias: state.transferencias.filter(t => t.id !== action.id), _lastAction: action.type }
    case 'ADD_FIXO':
      return { ...state, fixos: [...state.fixos, { ...action.payload, id: state.nextId, ativo: true }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_FIXO':
      return { ...state, fixos: state.fixos.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f), _lastAction: action.type }
    case 'TOGGLE_FIXO':
      return { ...state, fixos: state.fixos.map(f => f.id === action.id ? { ...f, ativo: !f.ativo } : f), _lastAction: action.type }
    case 'DEL_FIXO':
      return { ...state, fixos: state.fixos.filter(f => f.id !== action.id), _lastAction: action.type }
    case 'ADD_PARCELA':
      return { ...state, parcelas: [...state.parcelas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_PARCELA':
      return { ...state, parcelas: state.parcelas.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p), _lastAction: action.type }
    case 'DEL_PARCELA':
      return { ...state, parcelas: state.parcelas.filter(p => p.id !== action.id), _lastAction: action.type }
    case 'ADD_META':
      return { ...state, metas: [...state.metas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'DEL_META':
      return { ...state, metas: state.metas.filter(m => m.id !== action.id), _lastAction: action.type }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, EMPTY)
  const stateRef = useRef(state)
  const syncTimer = useRef(null)
  const syncQueue = useRef(Promise.resolve())

  useEffect(() => { stateRef.current = state }, [state])

  // Carrega dados na inicialização
  useEffect(() => {
    const load = async () => {
      const user = getCurrentUser()
      if (user) {
        try {
          const data = await loadUserData(user.uid)
          if (data) {
            const allIds = [
              ...data.lancamentos.map(l => parseInt(l.id) || 0),
              ...data.fixos.map(f => f.id || 0),
              ...data.parcelas.map(p => p.id || 0),
              ...data.contas.map(c => c.id || 0),
              ...data.transferencias.map(t => parseInt(t.id) || 0),
              ...data.metas.map(m => m.id || 0),
            ]
            const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 100
            dispatch({ type: 'LOAD', payload: { ...data, nextId } })
            return
          }
        } catch (e) {
          console.warn('Firebase load failed:', e)
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

  // Sync com Firebase
  useEffect(() => {
    if (!state._loaded || !state._lastAction) return
    if (!SYNC_ACTIONS.has(state._lastAction)) return

    // Salva localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}

    const user = getCurrentUser()
    if (!user) return

    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      syncQueue.current = syncQueue.current.then(async () => {
        const s = stateRef.current
        try {
          await saveUserData(user.uid, {
            lancamentos: s.lancamentos,
            fixos: s.fixos,
            parcelas: s.parcelas,
            contas: s.contas,
            transferencias: s.transferencias,
            metas: s.metas,
            reserva: s.reserva,
            investType: s.investType,
            orcamento: s.orcamento,
            nextId: s.nextId,
          })
        } catch (e) {
          console.warn('Firebase sync failed:', e)
        }
      })
    }, 1500)
  }, [state])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
