import { getMonthKey } from './formatters.js'

export const getLancsDoMes = (lancamentos, year, month) =>
  lancamentos.filter((l) => l.mes === getMonthKey(year, month))

export const getFixosTotal = (fixos) =>
  fixos.filter((f) => f.ativo).reduce((sum, f) => sum + f.valor, 0)

export const getParcelasTotal = (parcelas) =>
  parcelas.reduce((sum, p) => sum + p.valor, 0)

export const getMesData = (state, year, month) => {
  const lancs   = getLancsDoMes(state.lancamentos, year, month)
  const receitas = lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const despesas = lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
  const invest   = lancs.filter((l) => l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
  const fixos    = getFixosTotal(state.fixos)
  const parcelas = getParcelasTotal(state.parcelas)
  const totalSaidas = despesas + fixos + parcelas + invest
  return { receitas, despesas, invest, fixos, parcelas, totalSaidas, saldo: receitas - totalSaidas }
}

export const getContaSaldo = (state, contaId) => {
  const conta = state.contas.find((c) => c.id === contaId)
  if (!conta) return 0
  let saldo = conta.saldo
  state.lancamentos.forEach((l) => {
    if (l.contaId === contaId) {
      saldo += l.tipo === 'receita' ? l.valor : -l.valor
    }
  })
  state.transferencias.forEach((t) => {
    if (t.origemId  === contaId) saldo -= t.valor
    if (t.destinoId === contaId) saldo += t.valor
  })
  return saldo
}

export const getContaMesStats = (state, contaId, year, month) => {
  const lancs = getLancsDoMes(state.lancamentos, year, month).filter((l) => l.contaId === contaId)
  return {
    entrada: lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
    saida:   lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
  }
}

export const getTaxaPoupanca = (state, year, month) => {
  const d = getMesData(state, year, month)
  return d.receitas > 0 ? Math.round((d.saldo / d.receitas) * 100) : 0
}

export const getDiasReserva = (state) => {
  const now = new Date()
  const meses3 = []
  for (let i = 2; i >= 0; i--) {
    let m = now.getMonth() - i
    let y = now.getFullYear()
    while (m < 0) { m += 12; y-- }
    meses3.push({ year: y, month: m })
  }
  const mediaGastos = meses3.reduce((s, { year, month }) => s + getMesData(state, year, month).totalSaidas, 0) / 3
  return mediaGastos > 0 ? (state.reserva / mediaGastos) * 30 : 0
}

export const getBurnRate = (state) => {
  const now = new Date()
  const meses3 = []
  for (let i = 2; i >= 0; i--) {
    let m = now.getMonth() - i
    let y = now.getFullYear()
    while (m < 0) { m += 12; y-- }
    meses3.push({ year: y, month: m })
  }
  const mediaGastos = meses3.reduce((s, { year, month }) => s + getMesData(state, year, month).totalSaidas, 0) / 3
  return mediaGastos / 30
}

export const getInvestidoTotal = (state) => {
  const tiposInvest = ['investimento', 'poupanca']
  return state.contas
    .filter(c => tiposInvest.includes(c.tipo))
    .reduce((total, conta) => {
      // Saldo base da conta
      let saldo = parseFloat(conta.saldo) || 0
      // Soma aportes (lançamentos de investimento vinculados a esta conta)
      state.lancamentos
        .filter(l => l.contaId === conta.id && l.tipo === 'investimento')
        .forEach(l => { saldo += l.valor })
      return total + saldo
    }, 0)
}

// Saldo disponível = soma do saldo atual de contas correntes e digitais
export const getSaldoDisponivel = (state) => {
  const tiposOperacionais = ['corrente', 'digital']
  return state.contas
    .filter(c => tiposOperacionais.includes(c.tipo))
    .reduce((total, conta) => total + getContaSaldo(state, conta.id), 0)
}

// Compromissos pendentes — despesas com status 'pendente'
export const getCompromissosPendentes = (state) => {
  return state.lancamentos
    .filter(l => l.tipo === 'despesa' && l.status === 'pendente')
    .sort((a, b) => a.data.localeCompare(b.data))
}

export const getTotalPendente = (state) => {
  return getCompromissosPendentes(state).reduce((s, l) => s + l.valor, 0)
}

// Saldo disponível real = saldo contas operacionais - compromissos pendentes
export const getSaldoReal = (state) => {
  return getSaldoDisponivel(state) - getTotalPendente(state)
}
