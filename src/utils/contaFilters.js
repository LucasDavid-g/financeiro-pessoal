import { TIPO_LABEL } from '../data/defaults.js'

// Regras por contexto
// poupanca vai junto com investimento — é reserva/aplicação, não conta operacional
const TIPOS = {
  despesa:       ['corrente', 'digital', 'cartao'],
  receita:       ['corrente', 'digital', 'cartao'],
  investimento:  ['investimento', 'poupanca'],
  recorrente:    ['corrente', 'digital', 'cartao'],
  transferencia: ['corrente', 'digital', 'investimento', 'poupanca'],
  cartoes:       ['cartao'],
}

export const contasPorContexto = (contas, contexto) => {
  const tipos = TIPOS[contexto] || Object.keys(TIPO_LABEL)
  return contas.filter(c => tipos.includes(c.tipo))
}

export const contaLabel = (conta) =>
  `${conta.nome} · ${TIPO_LABEL[conta.tipo] || conta.tipo}`

export const contaOptions = (contas, contexto) =>
  contasPorContexto(contas, contexto).map(c => ({
    value: c.id,
    label: contaLabel(c),
  }))
