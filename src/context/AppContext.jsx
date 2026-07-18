import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { saveUserData, loadUserData, onAuthChange, getCurrentUser } from '../services/firebase.js'
import { getContaSaldo, toLocalISO, buildPagamentoTransfer } from '../utils/calculators.js'

// Efetiva automaticamente lançamentos pendentes cuja data já chegou/passou —
// cobre o cenário "a data chegou e o app não atualizou" sem exigir confirmação manual.
function efetivarPendentesVencidos(lancamentos) {
  const hoje = toLocalISO(new Date())
  let mudou = false
  const atualizados = (lancamentos || []).map(l => {
    if (l.status === 'pendente' && l.data <= hoje) {
      mudou = true
      return { ...l, status: 'pago' }
    }
    return l
  })
  return { atualizados, mudou }
}

const AppContext = createContext(null)
const STORAGE_KEY = 'mapa-do-bolso-state'

const SYNC_ACTIONS = new Set([
  'ADD_LANCAMENTO', 'EDIT_LANCAMENTO', 'DEL_LANCAMENTO',
  'ADD_CONTA', 'EDIT_CONTA', 'DEL_CONTA',
  'ADD_TRANSFER', 'DEL_TRANSFER',
  'ADD_FIXO', 'EDIT_FIXO', 'TOGGLE_FIXO', 'DEL_FIXO',
  'ADD_PARCELA', 'EDIT_PARCELA', 'DEL_PARCELA',
  'ADD_META', 'DEL_META', 'EDIT_META',
  'PAGAR_COMPROMISSO', 'RECEBER_RECEITA', 'AUTO_EFETIVAR_PENDENTES',
  'ADD_RECEITA_FIXA', 'EDIT_RECEITA_FIXA', 'TOGGLE_RECEITA_FIXA', 'DEL_RECEITA_FIXA',
  'SET_ORCAMENTO',
])

const EMPTY = {
  lancamentos: [], fixos: [], parcelas: [], contas: [], receitasFixas: [],
  transferencias: [], metas: [], reserva: 0,
  investType: 'CDI (cofrinho)', orcamento: null, nextId: 100,
  _loaded: false, _lastAction: null,
}

// Fix 4 (QC-3/SEC-3): um valor monetário só é válido se for número finito e positivo.
// Number.isFinite descarta NaN/Infinity; > 0 descarta zero e negativos.
const valorValido = (v) => Number.isFinite(v) && v > 0

// Actions cujo payload carrega um campo `valor` que precisa ser validado antes de persistir.
const VALOR_ACTIONS = new Set([
  'ADD_LANCAMENTO', 'EDIT_LANCAMENTO',
  'ADD_TRANSFER',
  'ADD_FIXO', 'EDIT_FIXO',
  'ADD_PARCELA', 'EDIT_PARCELA',
  'ADD_META', 'EDIT_META',
  'ADD_RECEITA_FIXA', 'EDIT_RECEITA_FIXA',
])

function reducer(state, action) {
  // Guarda de integridade: rejeita mutações com valor malformado (NaN, Infinity, <= 0)
  // antes de tocar no estado. Defesa em profundidade — os formulários também validam,
  // mas isto garante que dado corrompido nunca chega ao Firebase/localStorage.
  if (VALOR_ACTIONS.has(action.type) && !valorValido(action.payload?.valor)) return state
  // SET_ORCAMENTO aceita null (limpar orçamento) ou um valor positivo.
  if (action.type === 'SET_ORCAMENTO' && action.valor !== null && !valorValido(action.valor)) return state

  switch (action.type) {
    case 'LOAD':
      return { ...EMPTY, ...action.payload, _loaded: true, _lastAction: null }

    // Disparado após o LOAD quando lançamentos pendentes venceram e foram efetivados
    // automaticamente — apenas marca _lastAction para acionar o sync (estado já atualizado).
    case 'AUTO_EFETIVAR_PENDENTES':
      return { ...state, _lastAction: action.type }

    case 'ADD_LANCAMENTO': {
      const novo = { ...action.payload, id: state.nextId, mes: action.payload.data.slice(0, 7) }
      const reserva = novo.tipo === 'investimento' ? state.reserva + novo.valor : state.reserva
      return { ...state, lancamentos: [...state.lancamentos, novo], reserva, nextId: state.nextId + 1, _lastAction: action.type }
    }
    case 'EDIT_LANCAMENTO': {
      return {
        ...state,
        lancamentos: state.lancamentos.map(l =>
          l.id === action.payload.id
            ? { ...l, ...action.payload, mes: action.payload.data.slice(0, 7) }
            : l
        ),
        _lastAction: action.type,
      }
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
      const novasLancs     = state.lancamentos.filter(l => l.contaId !== id)
      const novasTransfers = state.transferencias.filter(t => t.origemId !== id && t.destinoId !== id)
      const novosFixos     = state.fixos.map(f => f.contaId === id ? { ...f, contaId: null } : f)
      // Captura saldo atual ANTES de remover a conta — preserva progresso de metas vinculadas.
      // Sem o snapshot, meta.atual ficaria no valor do momento da criação (potencialmente anos atrás).
      const saldoSnapshot  = Math.max(0, getContaSaldo(state, id))
      const novasMetas     = state.metas.map(m =>
        m.contaId === id ? { ...m, contaId: null, atual: saldoSnapshot } : m
      )
      const investsRemovidos = state.lancamentos.filter(l => l.contaId === id && l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
      return { ...state, contas: state.contas.filter(c => c.id !== id), lancamentos: novasLancs, transferencias: novasTransfers, fixos: novosFixos, metas: novasMetas, reserva: Math.max(0, state.reserva - investsRemovidos), _lastAction: action.type }
    }
    case 'PAGAR_COMPROMISSO': {
      const lanc = state.lancamentos.find(x => x.id === action.id)
      if (!lanc || lanc.status !== 'pendente') return state
      // LN-6: se a despesa é de um cartão, o pagamento vira transferência conta→cartão —
      // mantém a despesa no histórico do cartão e credita o cartão (abate a fatura).
      const transfer = buildPagamentoTransfer(state, lanc, action.contaId, state.nextId)
      if (transfer) {
        const updated = state.lancamentos.map(l =>
          l.id === action.id ? { ...l, status: 'pago' } : l   // mantém contaId no cartão
        )
        return {
          ...state,
          lancamentos: updated,
          transferencias: [...state.transferencias, transfer],
          nextId: state.nextId + 1,
          _lastAction: action.type,
        }
      }
      // Despesa comum: marca paga e atribui à conta escolhida (comportamento anterior)
      const updated = state.lancamentos.map(l =>
        l.id === action.id ? { ...l, status: 'pago', contaId: action.contaId || l.contaId } : l
      )
      return { ...state, lancamentos: updated, _lastAction: action.type }
    }
    case 'RECEBER_RECEITA': {
      // Marca receita futura pendente como recebida (paga) — espelha PAGAR_COMPROMISSO
      const lanc = state.lancamentos.find(x => x.id === action.id)
      if (!lanc || lanc.tipo !== 'receita' || lanc.status !== 'pendente') return state
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
      // criadoEm (LN-1): marca o mês a partir do qual o fixo passa a valer nas métricas mensais
      return { ...state, fixos: [...state.fixos, { ...action.payload, id: state.nextId, ativo: true, criadoEm: toLocalISO(new Date()) }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_FIXO':
      return { ...state, fixos: state.fixos.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f), _lastAction: action.type }
    case 'TOGGLE_FIXO':
      return { ...state, fixos: state.fixos.map(f => f.id === action.id ? { ...f, ativo: !f.ativo } : f), _lastAction: action.type }
    case 'DEL_FIXO':
      return { ...state, fixos: state.fixos.filter(f => f.id !== action.id), _lastAction: action.type }
    case 'ADD_PARCELA':
      // criadoEm (LN-2): âncora para derivar a parcela corrente e encerrar automaticamente
      return { ...state, parcelas: [...state.parcelas, { ...action.payload, id: state.nextId, criadoEm: toLocalISO(new Date()) }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_PARCELA':
      return { ...state, parcelas: state.parcelas.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p), _lastAction: action.type }
    case 'DEL_PARCELA':
      return { ...state, parcelas: state.parcelas.filter(p => p.id !== action.id), _lastAction: action.type }
    case 'ADD_META':
      return { ...state, metas: [...state.metas, { ...action.payload, id: state.nextId }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_META':
      return { ...state, metas: state.metas.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m), _lastAction: action.type }
    case 'DEL_META':
      return { ...state, metas: state.metas.filter(m => m.id !== action.id), _lastAction: action.type }
    case 'ADD_RECEITA_FIXA':
      // criadoEm (LN-1): idem fixos — receita fixa só entra no mês do cadastro em diante
      return { ...state, receitasFixas: [...(state.receitasFixas || []), { ...action.payload, id: state.nextId, ativo: true, criadoEm: toLocalISO(new Date()) }], nextId: state.nextId + 1, _lastAction: action.type }
    case 'EDIT_RECEITA_FIXA':
      return { ...state, receitasFixas: (state.receitasFixas || []).map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r), _lastAction: action.type }
    case 'TOGGLE_RECEITA_FIXA':
      return { ...state, receitasFixas: (state.receitasFixas || []).map(r => r.id === action.id ? { ...r, ativo: !r.ativo } : r), _lastAction: action.type }
    case 'DEL_RECEITA_FIXA':
      return { ...state, receitasFixas: (state.receitasFixas || []).filter(r => r.id !== action.id), _lastAction: action.type }
    case 'SET_ORCAMENTO':
      return { ...state, orcamento: action.valor, _lastAction: action.type }
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

  // Carrega dados na inicialização — usa onAuthChange em vez de getCurrentUser() síncrono.
  // getCurrentUser() retorna null nos primeiros ~300ms enquanto o Firebase restaura a sessão
  // do IndexedDB. Em dispositivos sem localStorage (celular, outro browser) isso fazia o app
  // carregar estado vazio mesmo com o usuário já logado. onAuthChange aguarda a sessão ser
  // restaurada antes de decidir o que carregar.
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        try {
          const data = await loadUserData(user.uid)
          if (data) {
            // Guards contra campos ausentes no Firebase (schema antigo, conta nova, ou dado parcial).
            // Sem esses guards, .map() em undefined lança TypeError e crasha a inicialização.
            const allIds = [
              ...(data.lancamentos  || []).map(l => parseInt(l.id) || 0),
              ...(data.fixos        || []).map(f => f.id || 0),
              ...(data.parcelas     || []).map(p => p.id || 0),
              ...(data.contas       || []).map(c => c.id || 0),
              ...(data.transferencias || []).map(t => parseInt(t.id) || 0),
              ...(data.metas        || []).map(m => m.id || 0),
            ]
            const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 100
            const { atualizados, mudou } = efetivarPendentesVencidos(data.lancamentos)
            dispatch({ type: 'LOAD', payload: { ...data, lancamentos: atualizados, nextId } })
            // Se algum pendente venceu, marca a última ação como sincronizável
            // para persistir a efetivação automática no Firebase/localStorage.
            if (mudou) setTimeout(() => dispatch({ type: 'AUTO_EFETIVAR_PENDENTES' }), 0)
            return
          }
        } catch (e) {
          console.warn('Firebase load failed:', e)
        }
      }
      // Fallback: localStorage (não logado, ou Firebase não tem dados ainda)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          const { atualizados, mudou } = efetivarPendentesVencidos(parsed.lancamentos)
          dispatch({ type: 'LOAD', payload: { ...parsed, lancamentos: atualizados } })
          if (mudou) setTimeout(() => dispatch({ type: 'AUTO_EFETIVAR_PENDENTES' }), 0)
        } else {
          dispatch({ type: 'LOAD', payload: {} })
        }
      } catch {
        dispatch({ type: 'LOAD', payload: {} })
      }
    })
    return unsubscribe
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
            receitasFixas: s.receitasFixas,
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
