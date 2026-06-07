import { getMonthKey } from './formatters.js'

export const getLancsDoMes = (lancamentos, year, month) =>
  lancamentos.filter((l) => l.mes === getMonthKey(year, month))

// ── Filtro por período (date range) ─────────────────────────────
export const getLancsDoPeriodo = (lancamentos, inicio, fim) =>
  lancamentos.filter((l) => l.data >= inicio && l.data <= fim)

export const getMetricasPeriodo = (state, inicio, fim) => {
  const lancs    = getLancsDoPeriodo(state.lancamentos, inicio, fim)
  const receitas = lancs.filter((l) => l.tipo === 'receita' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  const despesas = lancs.filter((l) => l.tipo === 'despesa' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  const invest   = lancs.filter((l) => l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
  const pendente = lancs.filter((l) => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0)
  return { receitas, despesas, invest, pendente, saldo: receitas - despesas - invest, lancs }
}

// Meses contidos num intervalo de datas
export const getMesesNoPeriodo = (inicio, fim) => {
  const meses = []
  const [iy, im] = inicio.split('-').map(Number)
  const [fy, fm] = fim.split('-').map(Number)
  let y = iy, m = im - 1
  const endY = fy, endM = fm - 1
  while (y < endY || (y === endY && m <= endM)) {
    meses.push({ year: y, month: m })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return meses
}

export const getFixosTotal = (fixos) =>
  fixos.filter((f) => f.ativo).reduce((sum, f) => sum + f.valor, 0)

export const getParcelasTotal = (parcelas) =>
  parcelas.reduce((sum, p) => sum + p.valor, 0)

export const getReceitasFixasTotal = (receitasFixas = []) =>
  receitasFixas.filter(r => r.ativo).reduce((s, r) => s + r.valor, 0)

export const getMesData = (state, year, month) => {
  const lancs    = getLancsDoMes(state.lancamentos, year, month)
  // Receitas futuras (data > hoje) entram com status 'pendente' e não contam
  // até serem efetivamente recebidas — análogo ao tratamento de despesas pendentes.
  const receitas = lancs.filter((l) => l.tipo === 'receita' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  // Apenas despesas PAGAS — pendentes não afetam orçamento nem burn rate
  const despesas = lancs.filter((l) => l.tipo === 'despesa' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  const invest   = lancs.filter((l) => l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
  // Fixos/receitas fixas com `dia` cadastrado só entram no saldo do mês atual
  // quando o dia já chegou — antes disso, contam apenas na projeção (getSaldoProjetado).
  const hojeDia = new Date().getDate()
  const fixosVencidos = state.fixos
    .filter(f => f.ativo && (!f.dia || f.dia <= hojeDia))
    .reduce((s, f) => s + f.valor, 0)
  const recFixasVencidas = (state.receitasFixas || [])
    .filter(r => r.ativo && (!r.dia || r.dia <= hojeDia))
    .reduce((s, r) => s + r.valor, 0)

  const fixos    = getFixosTotal(state.fixos)
  const parcelas = getParcelasTotal(state.parcelas)
  const recFixas = getReceitasFixasTotal(state.receitasFixas)
  const totalSaidas = despesas + fixosVencidos + parcelas + invest
  return { receitas: receitas + recFixasVencidas, recFixas, despesas, invest, fixos, parcelas, totalSaidas, saldo: (receitas + recFixasVencidas) - totalSaidas }
}

export const getContaSaldo = (state, contaId) => {
  const conta = state.contas.find((c) => c.id === contaId)
  if (!conta) return 0
  let saldo = conta.saldo
  state.lancamentos.forEach((l) => {
    // Lançamentos pendentes (receita futura ou despesa a pagar) ainda não
    // impactam o saldo real da conta — só ao serem efetivados (RECEBER_RECEITA / PAGAR_COMPROMISSO)
    if (l.contaId === contaId && l.status !== 'pendente') {
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
    entrada: lancs.filter((l) => l.tipo === 'receita' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0),
    // Apenas despesas PAGAS — consistente com getMesData e getMetricasPeriodo
    saida:   lancs.filter((l) => l.tipo === 'despesa' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0),
  }
}

export const getTaxaPoupanca = (state, year, month) => {
  const d = getMesData(state, year, month)
  return d.receitas > 0 ? Math.round((d.saldo / d.receitas) * 100) : 0
}

// Média de gastos mensais dos últimos 3 meses — helper privado compartilhado por
// getDiasReserva e getBurnRate, evitando duplicação de 6 chamadas getMesData.
const _mediaGastos3Meses = (state) => {
  const now = new Date()
  let total = 0
  for (let i = 2; i >= 0; i--) {
    let m = now.getMonth() - i
    let y = now.getFullYear()
    while (m < 0) { m += 12; y-- }
    total += getMesData(state, y, m).totalSaidas
  }
  return total / 3
}

// Dias de reserva = total investido ÷ média de gastos mensais × 30.
// Fonte: saldo real das contas de investimento/poupança (via getContaSaldo),
// que inclui saldo inicial, lançamentos e transferências — fonte única de verdade.
export const getDiasReserva = (state) => {
  const tiposInvest = ['investimento', 'poupanca']
  const totalInvestido = state.contas
    .filter(c => tiposInvest.includes(c.tipo))
    .reduce((s, c) => s + Math.max(0, getContaSaldo(state, c.id)), 0)
  const mediaGastos = _mediaGastos3Meses(state)
  return mediaGastos > 0 ? (totalInvestido / mediaGastos) * 30 : 0
}

// Burn rate diário = média de gastos mensais (últimos 3 meses) ÷ 30
export const getBurnRate = (state) => {
  return _mediaGastos3Meses(state) / 30
}

// Total investido = soma do saldo real das contas de investimento e poupança.
// Usa getContaSaldo (fonte única) que considera saldo inicial + lançamentos + transferências.
// Fonte oficial para o Hero "Investido" e getDiasReserva.
export const getInvestidoTotal = (state) => {
  const tiposInvest = ['investimento', 'poupanca']
  return state.contas
    .filter(c => tiposInvest.includes(c.tipo))
    .reduce((total, conta) => total + Math.max(0, getContaSaldo(state, conta.id)), 0)
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

// Fatura real do cartão: lançamentos + parcelas vinculadas + fixos vinculados
//
// Compatibilidade dupla de schema para parcelas:
//   - Schema legado (Firebase/localStorage atual): { cartao: 'Nubank' }   ← string com nome
//   - Schema futuro (migração gradual):            { cartaoId: 3, cartao: 'Nubank' } ← id numérico + nome
// Quando migrar, adicionar cartaoId ao salvar parcelas e manter cartao para retrocompatibilidade.
export const getFaturaCartao = (state, contaId) => {
  const conta         = state.contas.find(c => c.id === contaId)
  const faturaLancs   = Math.max(0, -getContaSaldo(state, contaId))
  const parcelasCartao = state.parcelas
    // aceita cartaoId (numérico, schema novo) OU cartao (string, schema atual)
    .filter(p => p.cartaoId === contaId || p.cartao === conta?.nome)
    .reduce((s, p) => s + p.valor, 0)
  const fixosCartao   = state.fixos
    .filter(f => f.ativo && f.contaId === contaId)
    .reduce((s, f) => s + f.valor, 0)
  return faturaLancs + parcelasCartao + fixosCartao
}

// Saldo projetado = disponível - pendentes - fixos operacionais ativos
// IC-02: parcelas excluídas — todas vinculadas a cartão, vão via fatura (não debitam saldo
// operacional diretamente). Fixos cujo contaId aponta para um cartão também excluídos pelo
// mesmo motivo. Fixos sem conta (null) ou em contas correntes/digitais são mantidos.
export const getSaldoProjetado = (state) => {
  const cartaoIds = new Set(state.contas.filter(c => c.tipo === 'cartao').map(c => c.id))

  // Despesas fixas ativas (todas, independente do dia — projeção do ciclo completo)
  const fixosTotal = state.fixos
    .filter(f => f.ativo && !cartaoIds.has(f.contaId))
    .reduce((s, f) => s + f.valor, 0)

  // Receitas fixas ativas (todas)
  const recFixasTotal = (state.receitasFixas || [])
    .filter(r => r.ativo)
    .reduce((s, r) => s + r.valor, 0)

  // Lançamentos avulsos pendentes (despesas futuras)
  const pendentesDesp = getTotalPendente(state)

  // Lançamentos avulsos pendentes (receitas futuras)
  const pendentesRec = getTotalReceitasPendentes(state)

  return getSaldoDisponivel(state)
    - fixosTotal
    - pendentesDesp
    + recFixasTotal
    + pendentesRec
}

// Formata Date local como 'YYYY-MM-DD' sem conversão UTC.
// Evita o deslocamento de 1 dia causado por .toISOString() em fusos UTC-negativo (ex: UTC-3).
// Exportado para uso em componentes (Dashboard, Contas) que precisam da data local.
export const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// BUG-C03: garante que o dia solicitado é válido no mês informado.
// Evita overflow: new Date(2024, 1, 31) vira 2 de março em vez de 29 de fevereiro.
// Uso: new Date(year, month, clampDay(year, month, day))
const clampDay = (year, month, day) => Math.min(day, new Date(year, month + 1, 0).getDate())

// Ciclo real do cartão baseado na data de fechamento.
// Fatura do ciclo atual = lançamentos manuais do ciclo + parcelas + fixos mensais vinculados.
// Retorna null se o cartão não tiver fechamento configurado.
//
// Ciclo atual: do último fechamento (inclusive) ao próximo fechamento (exclusive).
export const getCicloCartao = (state, contaId) => {
  const conta = state.contas.find(c => c.id === contaId)
  if (!conta || conta.tipo !== 'cartao' || !conta.fechamento) return null

  const hoje = new Date()
  const fech = conta.fechamento

  // Próximo fechamento — clampDay protege dias 29/30/31 em meses mais curtos (BUG-C03)
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  let fimCiclo = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), clampDay(mesAtual.getFullYear(), mesAtual.getMonth(), fech))
  if (fimCiclo <= hoje) {
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    fimCiclo = new Date(proximoMes.getFullYear(), proximoMes.getMonth(), clampDay(proximoMes.getFullYear(), proximoMes.getMonth(), fech))
  }

  // Início do ciclo: mesmo dia de fechamento, um mês antes do fim — com clamp
  const mesAnterior = new Date(fimCiclo.getFullYear(), fimCiclo.getMonth() - 1, 1)
  const inicioC = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), clampDay(mesAnterior.getFullYear(), mesAnterior.getMonth(), fech))

  const inicioISO = toLocalISO(inicioC)
  const fimISO    = toLocalISO(fimCiclo)

  // Lançamentos de despesas do cartão no ciclo atual (exclui o dia do fechamento)
  const faturaLancs = state.lancamentos
    .filter(l => l.contaId === contaId && l.tipo === 'despesa' && l.data >= inicioISO && l.data < fimISO)
    .reduce((s, l) => s + l.valor, 0)

  // BUG-C02: dívida pré-ciclo = saldo inicial do cartão + lançamentos anteriores ao ciclo.
  // Fórmula: -(getContaSaldo + faturaLancs) isola a parte não coberta pelo ciclo atual.
  // Com preExistente, faturaAtual converge com getFaturaCartao para cartões com fechamento.
  const preExistente = Math.max(0, -(getContaSaldo(state, contaId) + faturaLancs))

  // Parcelas mensais (schema duplo para retrocompatibilidade)
  const mensaisParcelas = state.parcelas
    .filter(p => p.cartaoId === contaId || p.cartao === conta.nome)
    .reduce((s, p) => s + p.valor, 0)

  // Fixos mensais vinculados ao cartão
  const mensaisFixos = state.fixos
    .filter(f => f.ativo && f.contaId === contaId)
    .reduce((s, f) => s + f.valor, 0)

  const mensais = mensaisParcelas + mensaisFixos

  // Dias até fechamento
  const diasAteFechamento = Math.ceil((fimCiclo - hoje) / 86400000)

  // Dias até vencimento — com clamp (BUG-C03)
  let diasAteVencimento = null
  if (conta.vencimento) {
    const mesVenc = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    let venc = new Date(mesVenc.getFullYear(), mesVenc.getMonth(), clampDay(mesVenc.getFullYear(), mesVenc.getMonth(), conta.vencimento))
    if (venc <= hoje) {
      const proximoMesV = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
      venc = new Date(proximoMesV.getFullYear(), proximoMesV.getMonth(), clampDay(proximoMesV.getFullYear(), proximoMesV.getMonth(), conta.vencimento))
    }
    diasAteVencimento = Math.ceil((venc - hoje) / 86400000)
  }

  return {
    inicioISO,
    fimISO,
    faturaLancs,
    preExistente,
    mensais,
    faturaAtual: preExistente + faturaLancs + mensais,
    diasAteFechamento,
    diasAteVencimento,
  }
}

// Próximas saídas: pendentes com data >= hoje + vencimentos de cartão no mês
export const getProximasSaidas = (state) => {
  const hoje  = toLocalISO(new Date())
  const saidas = []

  // 1. Despesas pendentes com data >= hoje
  getCompromissosPendentes(state)
    .filter(l => l.data >= hoje)
    .forEach(l => saidas.push({
      id:     `p-${l.id}`,
      data:   l.data,
      desc:   l.desc,
      valor:  l.valor,
      tipo:   'pendente',
      lancId: l.id,
    }))

  // 2. Vencimentos de cartão (apenas se fatura > 0)
  // Usa getCicloCartao quando fechamento está configurado (mesma fonte que Contas.jsx),
  // fallback para getFaturaCartao quando não há fechamento definido.
  const now = new Date()
  state.contas
    .filter(c => c.tipo === 'cartao' && c.vencimento)
    .forEach(c => {
      const ciclo  = getCicloCartao(state, c.id)
      const fatura = ciclo ? ciclo.faturaAtual : getFaturaCartao(state, c.id)
      if (fatura <= 0) return
      // Usa toLocalISO para evitar deslocamento UTC em fusos negativos
      let d = new Date(now.getFullYear(), now.getMonth(), c.vencimento)
      if (toLocalISO(d) < hoje) {
        d = new Date(now.getFullYear(), now.getMonth() + 1, c.vencimento)
      }
      saidas.push({
        id:    `fatura-${c.id}`,
        data:  toLocalISO(d),
        desc:  `Fatura ${c.nome}`,
        valor: fatura,
        tipo:  'fatura',
      })
    })

  return saidas.sort((a, b) => a.data.localeCompare(b.data))
}

// Receitas futuras pendentes (data > hoje, status 'pendente', tipo 'receita').
// Análogo ao getCompromissosPendentes, mas para o lado das entradas —
// usado no card "Próximas receitas" do Dashboard.
export const getReceitasPendentes = (state) => {
  const hoje = toLocalISO(new Date())
  return state.lancamentos
    .filter(l => l.tipo === 'receita' && l.status === 'pendente')
    .sort((a, b) => a.data.localeCompare(b.data))
}

export const getTotalReceitasPendentes = (state) =>
  getReceitasPendentes(state).reduce((s, l) => s + l.valor, 0)

// Unifica fixos com dia futuro, compromissos avulsos pendentes e receitas
// avulsas pendentes em uma lista única ordenada por data — usada no card
// "Próximos eventos" do Dashboard.
export const getProximosVencimentos = (state) => {
  const hoje = new Date().getDate()
  const mesAtual = toLocalISO(new Date()).slice(0, 7)
  const eventos = []

  // Despesas fixas com dia futuro
  state.fixos
    .filter(f => f.ativo && f.dia && f.dia > hoje)
    .forEach(f => {
      const data = `${mesAtual}-${String(f.dia).padStart(2, '0')}`
      eventos.push({ id: `fixo-${f.id}`, tipo: 'despesa_fixa', desc: f.desc, valor: f.valor, data, dia: f.dia })
    })

  // Receitas fixas com dia futuro
  ;(state.receitasFixas || [])
    .filter(r => r.ativo && r.dia && r.dia > hoje)
    .forEach(r => {
      const data = `${mesAtual}-${String(r.dia).padStart(2, '0')}`
      eventos.push({ id: `recfixa-${r.id}`, tipo: 'receita_fixa', desc: r.desc, valor: r.valor, data, dia: r.dia })
    })

  // Compromissos avulsos pendentes (já existem em getCompromissosPendentes)
  getCompromissosPendentes(state).forEach(l => {
    eventos.push({ id: `lanc-${l.id}`, tipo: l.tipo === 'receita' ? 'receita_avulsa' : 'despesa_avulsa', desc: l.desc, valor: l.valor, data: l.data })
  })

  // Receitas avulsas pendentes
  getReceitasPendentes(state).forEach(l => {
    eventos.push({ id: `rec-${l.id}`, tipo: 'receita_avulsa', desc: l.desc, valor: l.valor, data: l.data })
  })

  // Ordenar por data
  return eventos.sort((a, b) => a.data.localeCompare(b.data))
}
