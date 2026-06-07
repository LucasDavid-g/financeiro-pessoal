import { useMemo, useState, useRef } from 'react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, BarElement, Filler, Tooltip,
} from 'chart.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  getLancsDoPeriodo, getMetricasPeriodo, getMesesNoPeriodo,
  getFixosTotal, getParcelasTotal, getInvestidoTotal,
  getSaldoDisponivel, getTotalPendente, getSaldoReal,
  getCompromissosPendentes, getContaSaldo, getMesData,
  getDiasReserva, getBurnRate, getSaldoProjetado, getProximasSaidas, getProximosVencimentos,
  getReceitasPendentes, getTotalReceitasPendentes,
  toLocalISO,
} from '../../utils/calculators.js'
import { fmt, fmtCompact } from '../../utils/formatters.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import { CAT_CONFIG, MONTHS_SHORT } from '../../data/defaults.js'
import { contaLabel } from '../../utils/contaFilters.js'
import { Badge }       from '../ui/Badge.jsx'
import { Button }      from '../ui/Button.jsx'
import { EmptyState }  from '../ui/EmptyState.jsx'
import { PeriodFilter } from '../ui/PeriodFilter.jsx'
import { PagarModal }  from '../ui/PagarModal.jsx'
import { usePeriod }   from '../../hooks/usePeriod.js'
import styles from './Dashboard.module.css'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Filler, Tooltip)

const tooltipStyle = {
  backgroundColor: '#0C1220', titleColor: '#E8EEFF', bodyColor: '#6B80A4',
  borderColor: '#1C2840', borderWidth: 1, padding: 10, cornerRadius: 8,
  displayColors: true, boxWidth: 8, boxHeight: 8,
}

function StatChip({ icon, label, rawValue, color, bg }) {
  // Em telas estreitas (≤480px), o valor completo ("R$ 999.999,99") não cabe
  // ao lado do label dentro do chip — usa formato compacto ("R$ 1,00 mi")
  // só aqui, mantendo o valor completo no desktop e no resto do app.
  const isMobile = useIsMobile(480)
  const value = isMobile ? fmtCompact(rawValue) : fmt(rawValue)
  return (
    <div className={styles.statChip} style={{ background: bg }}>
      <div className={styles.statChipIcon} style={{ color }}>
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <div className={styles.statChipLabel}>{label}</div>
        <div className={styles.statChipValue} style={{ color }}>{value}</div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon, gradient, delta, deltaLabel }) {
  const positive = delta == null || delta >= 0
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <div className={styles.kpiIcon} style={{ background: gradient }}>
          <i className={`ti ${icon}`} />
        </div>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiBottom}>
        {sub && <span className={styles.kpiSub}>{sub}</span>}
        {delta != null && (
          <span className={[styles.kpiDelta, positive ? styles.kpiDeltaUp : styles.kpiDeltaDown].join(' ')}>
            <i className={`ti ${positive ? 'ti-trending-up' : 'ti-trending-down'}`} />
            {Math.abs(delta)}% {deltaLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ title, sub }) {
  return (
    <div className={styles.sectionTitle}>
      <span className={styles.sectionTitleText}>{title}</span>
      {sub && <span className={styles.sectionTitleSub}>{sub}</span>}
    </div>
  )
}

export function Dashboard() {
  const { state, dispatch } = useApp()
  const { period, setPreset, setRange } = usePeriod()
  const { inicio, fim } = period
  const [pagando, setPagando] = useState(null)
  const [orcEdit, setOrcEdit] = useState(false)
  const [orcInput, setOrcInput] = useState('')
  const orcInputRef = useRef(null)

  // Métricas do período selecionado
  const metricas    = getMetricasPeriodo(state, inicio, fim)
  const { receitas, despesas, invest, pendente, saldo: saldoMes, lancs } = metricas

  const economia     = receitas - despesas - invest
  const taxaPoupanca = receitas > 0 ? Math.round((economia / receitas) * 100) : 0

  // ── saldosPorConta — calculado UMA vez por render, elimina ~70 chamadas redundantes ──
  // Cada getCicloCartao / donut / legenda precisaria recalcular O(n_lancamentos) individualmente.
  const saldosPorConta = useMemo(
    () => Object.fromEntries(state.contas.map(c => [c.id, getContaSaldo(state, c.id)])),
    [state.contas, state.lancamentos, state.transferencias]
  )

  // Métricas de conta (sempre atuais — não dependem do período)
  const saldoDisp     = getSaldoDisponivel(state)
  const totalPendente = getTotalPendente(state)
  const saldoReal     = getSaldoReal(state)
  const investido     = getInvestidoTotal(state)
  const fixosTotal    = getFixosTotal(state.fixos)
  const parcelasTotal = getParcelasTotal(state.parcelas)

  const patrimonioTotal = useMemo(
    () => state.contas.reduce((s, c) => s + (saldosPorConta[c.id] ?? 0), 0),
    [state.contas, saldosPorConta]
  )

  const receitasPendentes = useMemo(
    () => getReceitasPendentes(state),
    [state.lancamentos]
  )

  const compromissos = useMemo(
    () => getCompromissosPendentes(state),
    [state.lancamentos]
  )

  // Mês atual para orçamento (independente do filtro de período)
  const agora      = new Date()
  const agoraYear  = agora.getFullYear()
  const agoraMonth = agora.getMonth()
  const mesAtualData = useMemo(
    () => getMesData(state, agoraYear, agoraMonth),
    [state.lancamentos, state.fixos, state.parcelas, agoraYear, agoraMonth]
  )
  const gastosMes    = mesAtualData.despesas   // apenas despesas pagas do mês corrente
  const orcamento    = state.orcamento          // null = não definido
  const orcPct       = orcamento > 0 ? Math.min(100, Math.round((gastosMes / orcamento) * 100)) : 0
  const orcRestante  = orcamento != null ? Math.max(0, orcamento - gastosMes) : 0
  const orcStatus    = orcPct >= 100 ? 'exceeded' : orcPct >= 85 ? 'warning' : 'ok'

  const recentes = lancs.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
  // toLocalISO evita deslocamento UTC em UTC-3 (antes das 3h, toISOString() retorna dia anterior)
  const hoje     = toLocalISO(new Date())

  // Saúde financeira — memoizadas: evitam recalcular O(n) sobre lançamentos em cada render
  const diasReserva = useMemo(
    () => Math.round(getDiasReserva(state)),
    [state.contas, state.lancamentos, state.transferencias, state.fixos, state.parcelas]
  )
  const burnRate = useMemo(
    () => getBurnRate(state),
    [state.lancamentos, state.fixos, state.parcelas]
  )
  const saldoProjetado = useMemo(
    () => getSaldoProjetado(state),
    [state.contas, state.lancamentos, state.transferencias, state.fixos]
  )
  const proximasSaidas = useMemo(
    () => getProximasSaidas(state).slice(0, 5),
    [state.lancamentos, state.contas, state.fixos, state.parcelas]
  )

  const proximosEventos = useMemo(
    () => getProximosVencimentos(state).slice(0, 6),
    [state.lancamentos, state.fixos, state.receitasFixas]
  )

  // Insights automáticos
  const insights = useMemo(() => {
    const list = []
    if (taxaPoupanca < 0)
      list.push({ icon: 'ti-alert-triangle', color: 'var(--r400)', bg: 'rgba(244,63,94,.10)', text: `Gastos superaram receitas em ${fmt(Math.abs(economia))} no período.` })
    else if (taxaPoupanca >= 20)
      list.push({ icon: 'ti-thumb-up', color: 'var(--g400)', bg: 'rgba(16,185,129,.10)', text: `Ótimo! Taxa de poupança de ${taxaPoupanca}% no período.` })
    if (diasReserva > 0 && diasReserva < 30)
      list.push({ icon: 'ti-coin', color: 'var(--r400)', bg: 'rgba(244,63,94,.10)', text: `Reserva de emergência cobre apenas ${diasReserva} dias de gastos.` })
    else if (diasReserva >= 180)
      list.push({ icon: 'ti-shield-check', color: 'var(--g400)', bg: 'rgba(16,185,129,.10)', text: `Reserva sólida: ${diasReserva} dias de cobertura.` })
    if (compromissos.length > 0) {
      const vencidos = compromissos.filter(l => l.data < hoje)
      if (vencidos.length > 0)
        list.push({ icon: 'ti-calendar-x', color: 'var(--a400)', bg: 'rgba(245,158,11,.10)', text: `${vencidos.length} compromisso${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} aguardando pagamento.` })
    }
    if (saldoProjetado < 0)
      list.push({ icon: 'ti-trending-down', color: 'var(--r400)', bg: 'rgba(244,63,94,.10)', text: `Saldo projetado negativo: fixos e parcelas superam o saldo disponível.` })
    // Insight de orçamento
    if (orcamento != null && orcPct >= 100)
      list.push({ icon: 'ti-receipt-tax', color: 'var(--r400)', bg: 'rgba(244,63,94,.10)', text: `Orçamento estourado: gastos de ${fmt(gastosMes)} superam o limite de ${fmt(orcamento)} este mês.` })
    else if (orcamento != null && orcPct >= 85)
      list.push({ icon: 'ti-alert-circle', color: 'var(--a400)', bg: 'rgba(245,158,11,.10)', text: `${orcPct}% do orçamento mensal utilizado — restam ${fmt(orcRestante)}.` })
    return list.slice(0, 4)
  }, [taxaPoupanca, economia, diasReserva, compromissos, hoje, saldoProjetado, orcamento, orcPct, gastosMes, orcRestante])

  // ── Gráfico: Fluxo de caixa — meses do período ──────────────────
  const mesesPeriodo = useMemo(() => getMesesNoPeriodo(inicio, fim), [inicio, fim])

  const lineData = useMemo(() => ({
    labels: mesesPeriodo.map(m => `${MONTHS_SHORT[m.month]}/${String(m.year).slice(2)}`),
    datasets: [
      {
        label: 'Receitas',
        data: mesesPeriodo.map(m => {
          const isoM = `${m.year}-${String(m.month + 1).padStart(2,'0')}`
          return state.lancamentos
            .filter(l => l.mes === isoM && l.tipo === 'receita')
            .reduce((s, l) => s + l.valor, 0)
        }),
        borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)',
        tension: .4, fill: true, pointRadius: 4, pointHoverRadius: 6,
        borderWidth: 2, pointBackgroundColor: '#10B981',
      },
      {
        label: 'Despesas',
        data: mesesPeriodo.map(m => {
          const isoM = `${m.year}-${String(m.month + 1).padStart(2,'0')}`
          return state.lancamentos
            .filter(l => l.mes === isoM && l.tipo === 'despesa' && l.status !== 'pendente')
            .reduce((s, l) => s + l.valor, 0)
        }),
        borderColor: '#F43F5E', backgroundColor: 'rgba(244,63,94,0.06)',
        tension: .4, fill: true, pointRadius: 4, pointHoverRadius: 6,
        borderWidth: 2, pointBackgroundColor: '#F43F5E',
      },
    ],
  }), [state.lancamentos, inicio, fim])

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, mode: 'index', intersect: false } },
    scales: {
      x: { grid: { color: 'rgba(128,128,128,.05)' }, ticks: { color: '#6B80A4', font: { size: 10, family: 'JetBrains Mono' } } },
      y: { grid: { color: 'rgba(128,128,128,.05)' }, ticks: { color: '#6B80A4', font: { size: 10 }, callback: v => `R$${(v/1000).toFixed(1)}k` } },
    },
  }

  // ── Gráfico: Gastos por categoria ────────────────────────────────
  const catData = useMemo(() => {
    const cats = {}
    lancs.filter(l => l.tipo === 'despesa' && l.status !== 'pendente').forEach(l => {
      const k = l.cat || 'outros'
      cats[k] = (cats[k] || 0) + l.valor
    })
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6)
    return {
      labels: sorted.map(([k]) => k),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: ['#10B981','#3B82F6','#F59E0B','#F43F5E','#8B5CF6','#06B6D4'],
        borderWidth: 0, borderRadius: 6, barThickness: 20,
      }],
    }
  }, [lancs])

  const barOpts = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
    scales: {
      x: { grid: { color: 'rgba(128,128,128,.05)' }, ticks: { color: '#6B80A4', font: { size: 10 }, callback: v => `R$${v}` } },
      y: { grid: { display: false }, ticks: { color: '#6B80A4', font: { size: 11 } } },
    },
  }

  // ── Gráfico: Patrimônio por conta ────────────────────────────────
  const donutPatrimonio = useMemo(() => {
    const contas = state.contas.filter(c => (saldosPorConta[c.id] ?? 0) > 0)
    return {
      labels: contas.map(c => c.nome),
      datasets: [{
        data: contas.map(c => saldosPorConta[c.id] ?? 0),
        backgroundColor: contas.map(c => c.cor),
        borderWidth: 2, borderColor: 'transparent', hoverOffset: 4,
      }],
    }
  }, [state.contas, saldosPorConta])

  // ── Gráfico: Composição de gastos ────────────────────────────────
  const donutGastos = useMemo(() => ({
    labels: ['Fixos', 'Parcelas', 'Variável'],
    datasets: [{
      data: [fixosTotal, parcelasTotal, Math.max(0, despesas - fixosTotal - parcelasTotal)],
      backgroundColor: ['#10B981','#3B82F6','#F59E0B'],
      borderWidth: 2, borderColor: 'transparent', hoverOffset: 4,
    }],
  }), [fixosTotal, parcelasTotal, despesas])

  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
  }

  const totalGastos = fixosTotal + parcelasTotal + Math.max(0, despesas - fixosTotal - parcelasTotal)

  return (
    <div className={`dash-grid ${styles.dashboard}`}>

      {/* ── Hero — Patrimônio ─────────────────── */}
      <div className={`col-7 ${styles.heroCard}`}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />
        <div className={styles.heroLabel}>Patrimônio total</div>
        <div className={styles.heroValue}>{fmt(patrimonioTotal)}</div>
        <div className={styles.heroStats}>
          <StatChip icon="ti-wallet"      label="Disponível"    rawValue={saldoDisp}     color="#10B981" bg="rgba(16,185,129,0.10)" />
          <StatChip icon="ti-clock-pause" label="Comprometido"  rawValue={totalPendente} color="#F59E0B" bg="rgba(245,158,11,0.10)" />
          <StatChip icon="ti-trending-up" label="Investido"     rawValue={investido}     color="#3B82F6" bg="rgba(59,130,246,0.10)" />
        </div>
        <div className={styles.projetadoLinha}>
          Projetado para o próximo mês: <span style={{ color: saldoProjetado >= 0 ? 'var(--g400)' : 'var(--r400)', fontWeight: 600 }}>
            {fmt(saldoProjetado)}
          </span>
        </div>
      </div>

      {/* ── Saldo disponível ──────────────────── */}
      <div className={`col-5 ${styles.saldoCard}`}>
        <div className={styles.saldoLabel}>Saldo disponível</div>
        <div className={styles.saldoValue} style={{ color: saldoReal >= 0 ? 'var(--g400)' : 'var(--r400)' }}>
          {fmt(saldoReal)}
        </div>
        <div className={styles.saldoDesc}>
          Após descontar {fmt(totalPendente)} comprometido
        </div>
        <div className={styles.saldoBar}>
          <div className={styles.saldoBarFill} style={{
            width: saldoDisp > 0 ? `${Math.max(0, Math.min(100, (saldoReal / saldoDisp) * 100))}%` : '0%',
            background: saldoReal >= 0 ? 'var(--gradient-brand)' : 'var(--gradient-red)',
          }} />
        </div>
        <div className={styles.saldoBarLabels}>
          <span>0%</span>
          <span style={{ color: saldoReal >= 0 ? 'var(--g400)' : 'var(--r400)' }}>
            {saldoDisp > 0 ? Math.round((saldoReal / saldoDisp) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* ── Filtro de período ─────────────────── */}
      <div className={`col-12 ${styles.periodRow}`}>
        <div className={styles.periodLeft}>
          <i className="ti ti-chart-line" style={{ color: 'var(--color-text3)', fontSize: 14 }} />
          <span className={styles.periodInfo}>Indicadores do período</span>
        </div>
        <PeriodFilter period={period} onPreset={setPreset} onRange={setRange} align="right" />
      </div>

      {/* ── KPIs do período ───────────────────── */}
      <div className={`col-12 ${styles.kpiRow}`}>
        <KpiCard
          label="Receitas"
          value={fmt(receitas)}
          icon="ti-arrow-down-left"
          gradient="linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))"
          sub={`${taxaPoupanca}% de poupança`}
        />
        <KpiCard
          label="Despesas"
          value={fmt(despesas)}
          icon="ti-arrow-up-right"
          gradient="linear-gradient(135deg,rgba(244,63,94,.15),rgba(244,63,94,.05))"
          sub="apenas pagas"
        />
        <KpiCard
          label="Economia"
          value={fmt(Math.abs(economia))}
          icon={economia >= 0 ? 'ti-piggy-bank' : 'ti-mood-sad'}
          gradient={economia >= 0
            ? 'linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))'
            : 'linear-gradient(135deg,rgba(244,63,94,.15),rgba(244,63,94,.05))'}
          sub={economia >= 0 ? 'guardado no período' : 'no vermelho'}
        />
        <KpiCard
          label="Comprometido mensal"
          value={fmt(fixosTotal + parcelasTotal)}
          icon="ti-repeat"
          gradient="linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.05))"
          sub="fixos + parcelas"
        />
      </div>

      {/* ── Orçamento mensal ─────────────────── */}
      <div className={`col-12 ${styles.orcCard}`}>
        <div className={styles.orcTop}>
          <div className={styles.orcLeft}>
            <i className="ti ti-receipt" style={{ color: 'var(--color-text3)', fontSize: 14 }} />
            <span className={styles.orcTitle}>Orçamento mensal</span>
            {orcamento != null && (
              <span className={styles.orcMes}>{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][agoraMonth]}/{agoraYear}</span>
            )}
          </div>
          {orcamento != null && !orcEdit && (
            <button className={styles.orcEditBtn} onClick={() => { setOrcInput(String(orcamento)); setOrcEdit(true); setTimeout(() => orcInputRef.current?.focus(), 50) }}>
              <i className="ti ti-pencil" />
            </button>
          )}
        </div>

        {orcamento == null && !orcEdit ? (
          /* Estado: sem orçamento definido */
          <div className={styles.orcEmpty}>
            <span className={styles.orcEmptyText}>Defina um limite mensal de gastos para acompanhar o progresso</span>
            <button className={styles.orcSetBtn} onClick={() => { setOrcInput(''); setOrcEdit(true); setTimeout(() => orcInputRef.current?.focus(), 50) }}>
              <i className="ti ti-plus" /> Definir orçamento
            </button>
          </div>
        ) : orcEdit ? (
          /* Estado: editando */
          <div className={styles.orcEditRow}>
            <span className={styles.orcCurrency}>R$</span>
            <input
              ref={orcInputRef}
              type="number"
              step="0.01"
              placeholder="ex: 3000"
              value={orcInput}
              onChange={e => setOrcInput(e.target.value)}
              className={styles.orcInput}
              onKeyDown={e => {
                if (e.key === 'Enter') { const v = parseFloat(orcInput); if (v > 0) { dispatch({ type: 'SET_ORCAMENTO', valor: v }); setOrcEdit(false) } }
                if (e.key === 'Escape') setOrcEdit(false)
              }}
            />
            <button className={styles.orcConfirmBtn} onClick={() => { const v = parseFloat(orcInput); if (v > 0) { dispatch({ type: 'SET_ORCAMENTO', valor: v }); setOrcEdit(false) } }}>
              <i className="ti ti-check" /> Salvar
            </button>
            {orcamento != null && (
              <button className={styles.orcRemoveBtn} onClick={() => { dispatch({ type: 'SET_ORCAMENTO', valor: null }); setOrcEdit(false) }} title="Remover orçamento">
                <i className="ti ti-trash" />
              </button>
            )}
            <button className={styles.orcCancelBtn} onClick={() => setOrcEdit(false)}>Cancelar</button>
          </div>
        ) : (
          /* Estado: com orçamento definido */
          <div className={styles.orcBody}>
            <div className={styles.orcValues}>
              <div>
                <span className={styles.orcGasto} style={{ color: orcStatus === 'exceeded' ? 'var(--r400)' : orcStatus === 'warning' ? 'var(--a400)' : 'var(--color-text)' }}>
                  {fmt(gastosMes)}
                </span>
                <span className={styles.orcSep}> / </span>
                <span className={styles.orcLimite}>{fmt(orcamento)}</span>
              </div>
              <span className={styles.orcPct} style={{ color: orcStatus === 'exceeded' ? 'var(--r400)' : orcStatus === 'warning' ? 'var(--a400)' : 'var(--g400)' }}>
                {orcPct}%
              </span>
            </div>
            <div className={styles.orcBarWrap}>
              <div className={styles.orcBarFill} style={{
                width: `${orcPct}%`,
                background: orcStatus === 'exceeded' ? 'var(--gradient-red)' : orcStatus === 'warning' ? 'linear-gradient(90deg,#F59E0B,#D97706)' : 'var(--gradient-brand)',
              }} />
            </div>
            <div className={styles.orcFooter}>
              <span style={{ color: 'var(--color-text3)', fontSize: 12 }}>
                {orcStatus === 'exceeded'
                  ? `Acima do limite em ${fmt(gastosMes - orcamento)}`
                  : `Restam ${fmt(orcRestante)} de ${fmt(orcamento)}`}
              </span>
              <span style={{ color: 'var(--color-text3)', fontSize: 11 }}>despesas pagas no mês</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Insights ─────────────────────────── */}
      {insights.length > 0 && (
        <div className={`col-12 ${styles.insightsRow}`}>
          {insights.map((ins, i) => (
            <div key={i} className={styles.insightChip} style={{ background: ins.bg }}>
              <i className={`ti ${ins.icon}`} style={{ color: ins.color, fontSize: 15, flexShrink: 0 }} />
              <span className={styles.insightText}>{ins.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Fluxo de caixa ────────────────────── */}
      <div className={`col-8 ${styles.chartCard}`}>
        <SectionTitle title="Fluxo de caixa" sub={`${mesesPeriodo.length} ${mesesPeriodo.length === 1 ? 'mês' : 'meses'}`} />
        <div className={styles.chartLegend}>
          {[['#10B981','Receitas'],['#F43F5E','Despesas']].map(([c,l]) => (
            <div key={l} className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: c }} />
              <span>{l}</span>
            </div>
          ))}
        </div>
        <div className={styles.chartWrap} style={{ height: 200 }}>
          <Line data={lineData} options={lineOpts} />
        </div>
      </div>

      {/* ── Gastos por categoria ──────────────── */}
      <div className={`col-4 ${styles.chartCard}`}>
        <SectionTitle title="Gastos por categoria" sub="Período" />
        {catData.datasets[0].data.length > 0
          ? <div className={styles.chartWrap} style={{ height: 200 }}>
              <Bar data={catData} options={barOpts} />
            </div>
          : <EmptyState message="Sem despesas no período" icon="ti-chart-bar" compact />
        }
      </div>

      {/* ── Distribuição patrimônio ───────────── */}
      <div className={`col-4 ${styles.chartCard}`}>
        <SectionTitle title="Patrimônio por conta" />
        {state.contas.length > 0 ? (
          <div className={styles.donutWrap}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <Doughnut data={donutPatrimonio} options={donutOpts} />
            </div>
            <div className={styles.donutLegend}>
              {state.contas.map(c => {
                const s = saldosPorConta[c.id] ?? 0
                const pct = patrimonioTotal > 0 ? Math.round((s / patrimonioTotal) * 100) : 0
                return (
                  <div key={c.id} className={styles.donutItem}>
                    <div className={styles.donutDot} style={{ background: c.cor }} />
                    <span className={styles.donutName}>{c.nome}</span>
                    <span className={styles.donutPct}>{pct}%</span>
                    <span className={styles.donutVal}>{fmt(s)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : <EmptyState message="Nenhuma conta" icon="ti-building-bank" compact />}
      </div>

      {/* ── Composição de gastos ──────────────── */}
      <div className={`col-4 ${styles.chartCard}`}>
        <SectionTitle title="Composição de gastos" sub="fixos + período" />
        {totalGastos > 0 ? (
          <div className={styles.donutWrap}>
            <div style={{ width: 100, height: 100, flexShrink: 0 }}>
              <Doughnut data={donutGastos} options={donutOpts} />
            </div>
            <div className={styles.donutLegend}>
              {[['#10B981','Fixos',fixosTotal],['#3B82F6','Parcelas',parcelasTotal],['#F59E0B','Variável',Math.max(0,despesas-fixosTotal-parcelasTotal)]]
                .map(([color,label,val]) => (
                  <div key={label} className={styles.donutItem}>
                    <div className={styles.donutDot} style={{ background: color }} />
                    <span className={styles.donutName}>{label}</span>
                    <span className={styles.donutPct}>{totalGastos > 0 ? Math.round(val/totalGastos*100) : 0}%</span>
                    <span className={styles.donutVal}>{fmt(val)}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : <EmptyState message="Sem gastos no período" icon="ti-chart-pie" compact />}
      </div>

      {/* ── Saúde financeira ─────────────────── */}
      <div className={`col-4 ${styles.listCard}`}>
        <SectionTitle title="Saúde financeira" />
        <div className={styles.saudeGrid}>
          {[
            {
              icon:   'ti-coin',
              label:  'Reserva de emergência',
              value:  `${diasReserva} dias`,
              color:  diasReserva >= 90 ? 'var(--g400)' : diasReserva >= 30 ? 'var(--a400)' : 'var(--r400)',
              status: diasReserva >= 90 ? 'Excelente' : diasReserva >= 30 ? 'Adequada' : 'Insuficiente',
              // Baseado em: saldo real das contas de investimento/poupança ÷ média de gastos dos últimos 3 meses
              period: 'Contas investimento',
            },
            {
              icon:   'ti-flame',
              label:  'Burn rate diário',
              value:  fmt(burnRate),
              color:  'var(--color-text)',
              status: null,
              // Baseado em: média de gastos mensais dos últimos 3 meses ÷ 30
              period: 'Média últimos 3 meses',
            },
            {
              icon:   'ti-trending-up',
              label:  'Taxa de poupança',
              value:  `${taxaPoupanca}%`,
              color:  taxaPoupanca >= 20 ? 'var(--g400)' : taxaPoupanca >= 10 ? 'var(--a400)' : 'var(--r400)',
              status: null,
              // Baseado em: receitas e despesas do período selecionado no filtro
              period: 'Período selecionado',
            },
            {
              icon:   'ti-repeat',
              label:  'Comprometido fixo',
              value:  fmt(fixosTotal + parcelasTotal),
              color:  'var(--color-text)',
              status: null,
              // Baseado em: total de fixos ativos + parcelas mensais (valores atuais cadastrados)
              period: 'Mensal atual',
            },
          ].map(item => (
            <div key={item.label} className={styles.saudeItem}>
              <i className={`ti ${item.icon}`} style={{ color: item.color, fontSize: 18 }} />
              <div className={styles.saudeItemInfo}>
                <span className={styles.saudeItemLabel}>{item.label}</span>
                <span className={styles.saudeItemVal} style={{ color: item.color }}>{item.value}</span>
                <span className={styles.saudeItemSub}>
                  {item.status ? `${item.status} · ` : ''}{item.period}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Saldo projetado + Próximas saídas ── */}
      <div className={`col-8 ${styles.listCard}`}>
        <div className={styles.projecaoHeader}>
          <div>
            <SectionTitle title="Saldo projetado" sub="próximo ciclo mensal" />
            <div className={styles.projecaoVal} style={{ color: saldoProjetado >= 0 ? 'var(--g400)' : 'var(--r400)' }}>
              {fmt(saldoProjetado)}
            </div>
            <div className={styles.projecaoBreakdown}>
              <span>{fmt(saldoDisp)} disponível</span>
              <span style={{ color: 'var(--r400)' }}>- {fmt(totalPendente)} pendentes</span>
              <span style={{ color: 'var(--r400)' }}>- {fmt(fixosTotal)} fixos mensais</span>
              <span style={{ color: 'var(--r400)' }}>- {fmt(parcelasTotal)} parcelas mensais</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <SectionTitle title="Próximos eventos" sub={proximosEventos.length > 0 ? `${proximosEventos.length} itens` : ''} />
          {proximosEventos.length > 0 ? (
            <div className={styles.listBody}>
              {proximosEventos.map(ev => {
                const isReceita = ev.tipo === 'receita_fixa' || ev.tipo === 'receita_avulsa'
                const cor = isReceita ? 'var(--g400)' : 'var(--r400)'
                const bg  = isReceita ? 'rgba(16,185,129,.10)' : 'rgba(244,63,94,.10)'
                const icon = ev.tipo === 'despesa_fixa' || ev.tipo === 'receita_fixa' ? 'ti-repeat' : 'ti-clock'
                return (
                  <div key={ev.id} className={styles.listItem}>
                    <div className={styles.listItemIcon} style={{ background: bg, color: cor }}>
                      <i className={`ti ${icon}`} />
                    </div>
                    <div className={styles.listItemInfo}>
                      <span className={styles.listItemName}>{ev.desc}</span>
                      <span className={styles.listItemSub}>{ev.data}</span>
                    </div>
                    <div className={styles.listItemRight}>
                      <span className={styles.listItemVal} style={{ color: cor }}>
                        {isReceita ? '+' : '-'}{fmt(ev.valor)}
                      </span>
                      {ev.tipo === 'despesa_avulsa' && (
                        <Button small variant="success" onClick={() => setPagando(compromissos.find(c => c.id === parseInt(ev.id.replace('lanc-', ''))))}>Pagar</Button>
                      )}
                      {ev.tipo === 'receita_avulsa' && ev.id.startsWith('rec-') && (
                        <Button small variant="success" onClick={() => dispatch({ type: 'RECEBER_RECEITA', id: parseInt(ev.id.replace('rec-', '')) })}>Receber</Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="Nenhum evento previsto" icon="ti-calendar-check" compact />
          )}
        </div>
      </div>

      {/* ── Próximas Receitas ── */}
      <div className={`col-8 ${styles.listCard}`}>
        <SectionTitle title="Próximas receitas" sub={receitasPendentes.length > 0 ? `${receitasPendentes.length} itens` : ''} />
        {receitasPendentes.length > 0 ? (
          <div className={styles.listBody}>
            {receitasPendentes.map(r => (
              <div key={r.id} className={styles.listItem}>
                <div className={styles.listItemIcon} style={{ background: 'rgba(16,185,129,.10)', color: 'var(--g400)' }}>
                  <i className="ti ti-clock" />
                </div>
                <div className={styles.listItemInfo}>
                  <span className={styles.listItemName}>{r.desc}</span>
                  <span className={styles.listItemSub}>{r.data}</span>
                </div>
                <div className={styles.listItemRight}>
                  <span className={styles.listItemVal} style={{ color: 'var(--g400)' }}>{fmt(r.valor)}</span>
                  <Button small variant="success" onClick={() => dispatch({ type: 'RECEBER_RECEITA', id: r.id })}>Receber</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Nenhuma receita pendente" icon="ti-calendar-check" compact />
        )}
      </div>

      {/* ── Lançamentos recentes ──────────────── */}
      <div className={`col-12 ${styles.listCard}`}>
        <SectionTitle title="Lançamentos recentes" sub="Período selecionado" />
        {recentes.length > 0 ? (
          <div className={styles.listGrid}>
            {recentes.map(l => {
              const cfg   = CAT_CONFIG[l.cat] || CAT_CONFIG[l.tipo] || CAT_CONFIG.outro
              const conta = state.contas.find(c => c.id === l.contaId)
              return (
                <div key={l.id} className={styles.lancItem} style={{ opacity: l.status === 'pendente' ? .7 : 1 }}>
                  <div className={styles.lancIcon} style={{ background: cfg.bg, color: cfg.color }}>
                    <i className={`ti ${cfg.icon}`} />
                  </div>
                  <div className={styles.lancInfo}>
                    <span className={styles.lancDesc}>
                      {l.desc}
                      {l.status === 'pendente' && <Badge variant="a" style={{ marginLeft: 6 }}>pendente</Badge>}
                    </span>
                    <span className={styles.lancSub}>
                      {l.data}{conta ? ' · ' + contaLabel(conta) : ''}
                    </span>
                  </div>
                  <span className={styles.lancVal} style={{ color: l.tipo === 'receita' ? 'var(--g400)' : 'var(--r400)' }}>
                    {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState message="Nenhum lançamento no período" icon="ti-receipt" compact />
        )}
      </div>

      <PagarModal lancamento={pagando} onClose={() => setPagando(null)} />
    </div>
  )
}
