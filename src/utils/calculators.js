import { getMonthKey } from './formatters.js'

// Formata Date local como 'YYYY-MM-DD' sem conversão UTC.
// Evita o deslocamento de 1 dia causado por .toISOString() em fusos UTC-negativo (ex: UTC-3).
// Exportado para uso em componentes (Dashboard, Contas) que precisam da data local.
export const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// BUG-C03: garante que o dia solicitado é válido no mês informado.
// Evita overflow: new Date(2024, 1, 31) vira 2 de março em vez de 29 de fevereiro.
// Uso: new Date(year, month, clampDay(year, month, day))
const clampDay = (year, month, day) => Math.min(day, new Date(year, month + 1, 0).getDate())

// Data de ocorrência (vencimento) de um recorrente no mês (year, month), como 'YYYY-MM-DD'.
const ocorrenciaISO = (year, month, dia) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(clampDay(year, month, dia)).padStart(2, '0')}`

// LN-1: um recorrente (fixo/receita fixa) só passa a valer a partir do mês do seu cadastro.
// Item com `dia`: só conta num mês se a data de vencimento nesse mês for >= criadoEm.
// Item sem `dia`: conta a partir do mês de criadoEm (comparação por mês YYYY-MM).
// Fallback: dados legados sem `criadoEm` contam sempre (comportamento anterior preservado).
const nascidoAteOMes = (item, year, month) => {
  if (!item.criadoEm) return true
  if (!item.dia) return item.criadoEm.slice(0, 7) <= `${year}-${String(month + 1).padStart(2, '0')}`
  return ocorrenciaISO(year, month, item.dia) >= item.criadoEm
}

export const getLancsDoMes = (lancamentos, year, month) =>
  lancamentos.filter((l) => l.mes === getMonthKey(year, month))

// ── Filtro por período (date range) ─────────────────────────────
export const getLancsDoPeriodo = (lancamentos, inicio, fim) =>
  lancamentos.filter((l) => l.data >= inicio && l.data <= fim)

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

// LN-2: número da parcela corrente, derivado dos meses decorridos desde o cadastro
// somados ao `atual` informado na criação. Sem criadoEm (legado), usa `atual` estático.
export const parcelaAtualNoMes = (p, ref = new Date()) => {
  if (!p.criadoEm) return p.atual || 1
  const [cy, cm] = p.criadoEm.split('-').map(Number)
  const mesesDecorridos = (ref.getFullYear() - cy) * 12 + (ref.getMonth() - (cm - 1))
  return (p.atual || 1) + Math.max(0, mesesDecorridos)
}

// LN-2: uma parcela finita encerra quando a parcela corrente ultrapassa o total.
// total >= 999 = recorrente (sem fim). Legado sem criadoEm nunca encerra sozinho
// (fallback: preserva o comportamento anterior para dados existentes).
export const parcelaEncerrada = (p, ref = new Date()) => {
  if (!p.total || p.total >= 999) return false
  if (!p.criadoEm) return false
  return parcelaAtualNoMes(p, ref) > p.total
}

export const getParcelasTotal = (parcelas) =>
  parcelas.filter(p => !parcelaEncerrada(p)).reduce((sum, p) => sum + p.valor, 0)

export const getReceitasFixasTotal = (receitasFixas = []) =>
  receitasFixas.filter(r => r.ativo).reduce((s, r) => s + r.valor, 0)

// LN-4: fixos, receitas fixas e parcelas "realizados" dentro de um período arbitrário.
// Usa a data de ocorrência mensal (dia de vencimento, ou dia 1 do mês para itens sem dia)
// e só conta o que já se passou (occ <= hoje) — mesmo critério de "já ocorreu" do getMesData,
// generalizado para qualquer intervalo de datas (não só o mês corrente).
export const getFixosRecPeriodo = (state, inicio, fim) => {
  const hoje  = toLocalISO(new Date())
  const meses = getMesesNoPeriodo(inicio, fim)
  let fixos = 0, recFixas = 0, parcelas = 0

  meses.forEach(({ year, month }) => {
    const occDefault = `${year}-${String(month + 1).padStart(2, '0')}-01`

    state.fixos
      .filter(f => f.ativo && nascidoAteOMes(f, year, month))
      .forEach(f => {
        const occ = f.dia ? ocorrenciaISO(year, month, f.dia) : occDefault
        if (occ >= inicio && occ <= fim && occ <= hoje) fixos += f.valor
      })

    ;(state.receitasFixas || [])
      .filter(r => r.ativo && nascidoAteOMes(r, year, month))
      .forEach(r => {
        const occ = r.dia ? ocorrenciaISO(year, month, r.dia) : occDefault
        if (occ >= inicio && occ <= fim && occ <= hoje) recFixas += r.valor
      })

    // Parcelas não têm dia de vencimento próprio — aproxima a fatura mensal no dia 1.
    state.parcelas
      .filter(p => !parcelaEncerrada(p, new Date(year, month, 1)))
      .forEach(p => {
        if (occDefault >= inicio && occDefault <= fim && occDefault <= hoje) parcelas += p.valor
      })
  })

  return { fixos, recFixas, parcelas }
}

export const getMetricasPeriodo = (state, inicio, fim) => {
  const lancs    = getLancsDoPeriodo(state.lancamentos, inicio, fim)
  const receitas = lancs.filter((l) => l.tipo === 'receita' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  const despesas = lancs.filter((l) => l.tipo === 'despesa' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  const invest   = lancs.filter((l) => l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
  const pendente = lancs.filter((l) => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0)
  // LN-4: economia/taxa de poupança agora consideram fixos, receitas fixas e parcelas já
  // realizados no período — antes só somavam lançamentos avulsos, inflando artificialmente
  // a economia percebida quando o usuário tinha fixos/parcelas comprometidos.
  const { fixos: fixosRealizados, recFixas: recFixasRealizadas, parcelas: parcelasRealizadas } =
    getFixosRecPeriodo(state, inicio, fim)
  const receitasTotais = receitas + recFixasRealizadas
  const despesasTotais = despesas + fixosRealizados + parcelasRealizadas
  return {
    receitas, despesas, invest, pendente, lancs,
    fixosRealizados, recFixasRealizadas, parcelasRealizadas,
    receitasTotais, saldo: receitasTotais - despesasTotais - invest,
  }
}

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
  // LN-3: a "chegada" do vencimento é relativa ao mês consultado, não ao dia de hoje.
  // Mês passado (já encerrado): todo vencimento do mês já ocorreu.
  // Mês corrente: só conta se o dia já chegou (dia <= hoje) — futuros entram só na projeção.
  // Mês futuro: nada foi realizado ainda.
  const now = new Date()
  const mesCorrente = year === now.getFullYear() && month === now.getMonth()
  const mesPassado  = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())
  const jaOcorreu = (dia) => {
    if (mesPassado)   return true
    if (!mesCorrente) return false            // mês futuro
    return !dia || dia <= now.getDate()       // mês corrente
  }
  const fixosVencidos = state.fixos
    .filter(f => f.ativo && jaOcorreu(f.dia) && nascidoAteOMes(f, year, month))
    .reduce((s, f) => s + f.valor, 0)
  const recFixasVencidas = (state.receitasFixas || [])
    .filter(r => r.ativo && jaOcorreu(r.dia) && nascidoAteOMes(r, year, month))
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

// LN-6: ao pagar uma despesa pendente que pertence a um CARTÃO, o pagamento vira uma
// transferência conta-operacional → cartão. Isso mantém a despesa no histórico do cartão
// (marcada como paga) e credita o cartão (abate a fatura), enquanto debita a conta que pagou.
// Retorna a transferência a ser criada, ou null quando é despesa comum (pagamento direto).
export const buildPagamentoTransfer = (state, lanc, contaPagamentoId, nextId) => {
  const contaDespesa = state.contas.find(c => c.id === lanc.contaId)
  if (contaDespesa?.tipo !== 'cartao' || !contaPagamentoId) return null
  const hoje = toLocalISO(new Date())
  return {
    id: nextId,
    desc: `Pagamento fatura · ${contaDespesa.nome}`,
    origemId:  contaPagamentoId,
    destinoId: lanc.contaId,
    valor: lanc.valor,
    data: hoje,
    mes: hoje.slice(0, 7),
    auto: true,   // marca origem automática (pagamento de fatura) para a UI diferenciar
  }
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
    // LN-2: exclui parcelas já encerradas (parcela corrente > total)
    .filter(p => (p.cartaoId === contaId || p.cartao === conta?.nome) && !parcelaEncerrada(p))
    .reduce((s, p) => s + p.valor, 0)
  const fixosCartao   = state.fixos
    .filter(f => f.ativo && f.contaId === contaId)
    .reduce((s, f) => s + f.valor, 0)
  return faturaLancs + parcelasCartao + fixosCartao
}

// LN-7: total das faturas atuais de cartão para a projeção — SOMENTE o componente de
// compras avulsas já lançadas (= saldo devedor do cartão, faturaLancs de getFaturaCartao).
//
// Deliberadamente NÃO usa getFaturaCartao inteiro: os componentes de parcelas e fixos do
// cartão já são subtraídos em getSaldoProjetado via parcelasTotal (todas) e fixosTotal
// (todos os fixos, inclusive os de cartão). Somar getFaturaCartao cheio contaria parcelas
// e fixos de cartão duas vezes — exatamente a dupla contagem a evitar.
//
// faturaLancs vem de getContaSaldo, que exclui pendentes (esses já entram em getTotalPendente)
// e reflete pagamentos de fatura LN-6 (transferência credita o cartão, reduzindo o saldo devedor).
export const getFaturasCartaoTotal = (state) =>
  state.contas
    .filter(c => c.tipo === 'cartao')
    .reduce((s, c) => s + Math.max(0, -getContaSaldo(state, c.id)), 0)

// Saldo projetado = disponível - fixos - parcelas - pendentes - faturas de cartão + receitas fixas + receitas pendentes
// Fixos vinculados a cartão são despesas reais do próximo ciclo (saem pelo pagamento da fatura) e
// devem entrar na projeção. Parcelas mensais também, pelo mesmo motivo.
// LN-7: as compras avulsas já lançadas no cartão (faturaLancs) também sairão do disponível quando
// a fatura for paga — entram via getFaturasCartaoTotal (sem duplicar parcelas/fixos de cartão).
export const getSaldoProjetado = (state) => {
  // Todas as despesas fixas ativas, incluindo as vinculadas a cartão
  const fixosTotal = state.fixos
    .filter(f => f.ativo)
    .reduce((s, f) => s + f.valor, 0)

  // Parcelas mensais (assinaturas e parcelamentos em cartão)
  const parcelasTotal = getParcelasTotal(state.parcelas)

  // Receitas fixas ativas (todas)
  const recFixasTotal = (state.receitasFixas || [])
    .filter(r => r.ativo)
    .reduce((s, r) => s + r.valor, 0)

  // Lançamentos avulsos pendentes (despesas futuras)
  const pendentesDesp = getTotalPendente(state)

  // Lançamentos avulsos pendentes (receitas futuras)
  const pendentesRec = getTotalReceitasPendentes(state)

  // LN-7: faturas atuais de cartão (só avulsas — parcelas/fixos de cartão já contam acima)
  const faturasCartao = getFaturasCartaoTotal(state)

  return getSaldoDisponivel(state)
    - fixosTotal
    - parcelasTotal
    - pendentesDesp
    - faturasCartao
    + recFixasTotal
    + pendentesRec
}

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
  // LN-2: exclui parcelas já encerradas (parcela corrente > total)
  const mensaisParcelas = state.parcelas
    .filter(p => (p.cartaoId === contaId || p.cartao === conta.nome) && !parcelaEncerrada(p))
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
