import { toLocalISO } from './calculators.js'

// Tipos de lançamento — usados no seletor de tipo do "Novo lançamento" e do "Editar".
export const TIPOS = [
  { id: 'despesa',      label: 'Despesa',      icon: 'ti-arrow-up-right',   color: '#F43F5E', bg: 'rgba(244,63,94,.08)'   },
  { id: 'receita',      label: 'Receita',      icon: 'ti-arrow-down-left',  color: '#10B981', bg: 'rgba(16,185,129,.08)'  },
  { id: 'investimento', label: 'Investimento', icon: 'ti-trending-up',      color: '#3B82F6', bg: 'rgba(59,130,246,.08)'  },
]

// Data local de hoje como 'YYYY-MM-DD' (sem deslocamento UTC). Reaproveita toLocalISO,
// fonte única da formatação de data local do projeto.
export const localToday = () => toLocalISO(new Date())

// Contexto de conta usado para filtrar as opções de conta conforme o tipo do lançamento.
export const contextoConta = (tipo) =>
  tipo === 'investimento' ? 'investimento' : tipo === 'receita' ? 'receita' : 'despesa'

// Status derivado da data — regra universal do projeto: investimento é sempre 'pago';
// os demais ficam 'pendente' enquanto a data for futura. Espelha a efetivação automática
// feita no AppContext (efetivarPendentesVencidos) quando o dia chega.
export const deriveStatus = (tipo, data) =>
  tipo === 'investimento' ? 'pago' : (data > localToday() ? 'pendente' : 'pago')
