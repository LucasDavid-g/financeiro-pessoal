import { useMemo } from 'react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, BarElement, Filler, Tooltip,
} from 'chart.js'
import { useApp } from '../../context/AppContext.jsx'
import {
  getMesData, getLancsDoMes, getFixosTotal, getParcelasTotal,
  getInvestidoTotal, getSaldoDisponivel, getTotalPendente,
  getSaldoReal, getCompromissosPendentes, getContaSaldo,
} from '../../utils/calculators.js'
import { fmt, getPastMonths, monthLabel } from '../../utils/formatters.js'
import { CAT_CONFIG } from '../../data/defaults.js'
import { contaLabel } from '../../utils/contaFilters.js'
import { Badge } from '../ui/Badge.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import styles from './Dashboard.module.css'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Filler, Tooltip)

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

const tooltipStyle = {
  backgroundColor: '#0C1220',
  titleColor: '#E8EEFF',
  bodyColor: '#6B80A4',
  borderColor: '#1C2840',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
  boxWidth: 8,
  boxHeight: 8,
}

function StatChip({ icon, label, value, color, bg }) {
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

export function Dashboard({ selYear, selMonth }) {
  const { state, dispatch } = useApp()

  const d        = getMesData(state, selYear, selMonth)
  const dPrev    = getMesData(state, selMonth === 0 ? selYear - 1 : selYear, selMonth === 0 ? 11 : selMonth - 1)
  const saldoDisp    = getSaldoDisponivel(state)
  const totalPendente = getTotalPendente(state)
  const saldoReal    = getSaldoReal(state)
  const investido    = getInvestidoTotal(state)
  const compromissos  = getCompromissosPendentes(state)
  const fixosTotal   = getFixosTotal(state.fixos)
  const parcelasTotal = getParcelasTotal(state.parcelas)
  const patrimonioTotal = state.contas.reduce((s, c) => s + getContaSaldo(state, c.id), 0)

  const lancs   = getLancsDoMes(state.lancamentos, selYear, selMonth)
  const recentes = lancs.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)
  const hoje    = new Date().toISOString().slice(0, 10)

  const economia     = d.receitas - d.totalSaidas
  const tendReceita  = dPrev.receitas > 0 ? Math.round(((d.receitas - dPrev.receitas) / dPrev.receitas) * 100) : null
  const tendDespesa  = dPrev.despesas > 0 ? Math.round(((d.despesas - dPrev.despesas) / dPrev.despesas) * 100) : null
  const taxaPoupanca = d.receitas > 0 ? Math.round((economia / d.receitas) * 100) : 0

  // ── Gráfico: Fluxo de caixa (linha) ──────────────
  const meses = getPastMonths(selYear, selMonth, 6)
  const lineData = useMemo(() => ({
    labels: meses.map(m => monthLabel(m.year, m.month)),
    datasets: [
      {
        label: 'Receitas',
        data: meses.map(m => getMesData(state, m.year, m.month).receitas),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        tension: .4, fill: true, pointRadius: 4, pointHoverRadius: 6,
        borderWidth: 2, pointBackgroundColor: '#10B981',
      },
      {
        label: 'Despesas',
        data: meses.map(m => getMesData(state, m.year, m.month).totalSaidas),
        borderColor: '#F43F5E',
        backgroundColor: 'rgba(244,63,94,0.06)',
        tension: .4, fill: true, pointRadius: 4, pointHoverRadius: 6,
        borderWidth: 2, pointBackgroundColor: '#F43F5E',
      },
    ],
  }), [state, selYear, selMonth])

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle, mode: 'index', intersect: false } },
    scales: {
      x: { grid: { color: 'rgba(128,128,128,.05)' }, ticks: { color: '#6B80A4', font: { size: 10, family: 'JetBrains Mono' } } },
      y: { grid: { color: 'rgba(128,128,128,.05)' }, ticks: { color: '#6B80A4', font: { size: 10 }, callback: v => `R$${(v/1000).toFixed(1)}k` } },
    },
  }

  // ── Gráfico: Gastos por categoria (barra) ─────────
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
        borderWidth: 0, borderRadius: 6,
        barThickness: 20,
      }],
    }
  }, [lancs])

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
    scales: {
      x: { grid: { color: 'rgba(128,128,128,.05)' }, ticks: { color: '#6B80A4', font: { size: 10 }, callback: v => `R$${v}` } },
      y: { grid: { display: false }, ticks: { color: '#6B80A4', font: { size: 11 } } },
    },
  }

  // ── Gráfico: Distribuição patrimônio (donut) ──────
  const donutPatrimonio = useMemo(() => {
    const contas = state.contas.filter(c => getContaSaldo(state, c.id) > 0)
    return {
      labels: contas.map(c => c.nome),
      datasets: [{
        data: contas.map(c => getContaSaldo(state, c.id)),
        backgroundColor: contas.map(c => c.cor),
        borderWidth: 2,
        borderColor: 'transparent',
        hoverOffset: 4,
      }],
    }
  }, [state])

  // ── Gráfico: Composição de gastos (donut) ─────────
  const donutGastos = useMemo(() => ({
    labels: ['Fixos', 'Parcelas', 'Variável'],
    datasets: [{
      data: [fixosTotal, parcelasTotal, Math.max(0, d.despesas - fixosTotal - parcelasTotal)],
      backgroundColor: ['#10B981', '#3B82F6', '#F59E0B'],
      borderWidth: 2,
      borderColor: 'transparent',
      hoverOffset: 4,
    }],
  }), [fixosTotal, parcelasTotal, d])

  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: { legend: { display: false }, tooltip: { ...tooltipStyle } },
  }

  const totalGastos = fixosTotal + parcelasTotal + Math.max(0, d.despesas - fixosTotal - parcelasTotal)

  return (
    <div className={`dash-grid ${styles.dashboard}`}>

      {/* ── Hero — Patrimônio ─────────────────────── */}
      <div className={`col-7 ${styles.heroCard}`}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />
        <div className={styles.heroLabel}>Patrimônio total</div>
        <div className={styles.heroValue}>{fmt(patrimonioTotal)}</div>
        <div className={styles.heroStats}>
          <StatChip icon="ti-wallet" label="Disponível" value={fmt(saldoDisp)} color="#10B981" bg="rgba(16,185,129,0.10)" />
          <StatChip icon="ti-clock-pause" label="Comprometido" value={fmt(totalPendente)} color="#F59E0B" bg="rgba(245,158,11,0.10)" />
          <StatChip icon="ti-trending-up" label="Investido" value={fmt(investido)} color="#3B82F6" bg="rgba(59,130,246,0.10)" />
        </div>
      </div>

      {/* ── Saldo disponível real ────────────────── */}
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

      {/* ── KPIs do mês ─────────────────────────── */}
      <div className={`col-12 ${styles.kpiRow}`}>
        <KpiCard
          label="Receitas do mês"
          value={fmt(d.receitas)}
          icon="ti-arrow-down-left"
          gradient="linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))"
          delta={tendReceita}
          deltaLabel="vs mês ant."
          sub={`${taxaPoupanca}% economizado`}
        />
        <KpiCard
          label="Despesas do mês"
          value={fmt(d.despesas)}
          icon="ti-arrow-up-right"
          gradient="linear-gradient(135deg,rgba(244,63,94,.15),rgba(244,63,94,.05))"
          delta={tendDespesa}
          deltaLabel="vs mês ant."
          sub="apenas pagas"
        />
        <KpiCard
          label="Economia"
          value={fmt(Math.abs(economia))}
          icon={economia >= 0 ? 'ti-piggy-bank' : 'ti-mood-sad'}
          gradient={economia >= 0
            ? 'linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05))'
            : 'linear-gradient(135deg,rgba(244,63,94,.15),rgba(244,63,94,.05))'}
          sub={economia >= 0 ? 'guardado este mês' : 'no vermelho'}
        />
        <KpiCard
          label="Comprometido"
          value={fmt(fixosTotal + parcelasTotal)}
          icon="ti-repeat"
          gradient="linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.05))"
          sub="fixos + parcelas"
        />
      </div>

      {/* ── Fluxo de caixa ─────────────────────── */}
      <div className={`col-8 ${styles.chartCard}`}>
        <SectionTitle title="Fluxo de caixa" sub="Últimos 6 meses" />
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

      {/* ── Gastos por categoria ─────────────── */}
      <div className={`col-4 ${styles.chartCard}`}>
        <SectionTitle title="Gastos por categoria" sub="Mês atual" />
        {catData.datasets[0].data.length > 0
          ? <div className={styles.chartWrap} style={{ height: 200 }}>
              <Bar data={catData} options={barOpts} />
            </div>
          : <EmptyState message="Sem despesas registradas" icon="ti-chart-bar" compact />
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
                const saldo = getContaSaldo(state, c.id)
                const pct = patrimonioTotal > 0 ? Math.round((saldo / patrimonioTotal) * 100) : 0
                return (
                  <div key={c.id} className={styles.donutItem}>
                    <div className={styles.donutDot} style={{ background: c.cor }} />
                    <span className={styles.donutName}>{c.nome}</span>
                    <span className={styles.donutPct}>{pct}%</span>
                    <span className={styles.donutVal}>{fmt(saldo)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : <EmptyState message="Nenhuma conta" icon="ti-building-bank" compact />}
      </div>

      {/* ── Composição de gastos ─────────────── */}
      <div className={`col-4 ${styles.chartCard}`}>
        <SectionTitle title="Composição de gastos" />
        {totalGastos > 0 ? (
          <div className={styles.donutWrap}>
            <div style={{ width: 100, height: 100, flexShrink: 0 }}>
              <Doughnut data={donutGastos} options={donutOpts} />
            </div>
            <div className={styles.donutLegend}>
              {[['#10B981','Fixos',fixosTotal],['#3B82F6','Parcelas',parcelasTotal],['#F59E0B','Variável',Math.max(0,d.despesas-fixosTotal-parcelasTotal)]]
                .map(([color,label,val]) => (
                  <div key={label} className={styles.donutItem}>
                    <div className={styles.donutDot} style={{ background: color }} />
                    <span className={styles.donutName}>{label}</span>
                    <span className={styles.donutPct}>{totalGastos > 0 ? Math.round(val/totalGastos*100) : 0}%</span>
                    <span className={styles.donutVal}>{fmt(val)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        ) : <EmptyState message="Sem gastos no mês" icon="ti-chart-pie" compact />}
      </div>

      {/* ── Próximos compromissos ─────────────── */}
      <div className={`col-4 ${styles.listCard}`}>
        <div className={styles.listHeader}>
          <SectionTitle title="Próximos compromissos" sub={compromissos.length > 0 ? `${fmt(totalPendente)} total` : ''} />
        </div>
        {compromissos.length > 0 ? (
          <div className={styles.listBody}>
            {compromissos.slice(0, 5).map(l => {
              const vencido = l.data <= hoje
              return (
                <div key={l.id} className={[styles.listItem, vencido ? styles.listItemDanger : ''].join(' ')}>
                  <div className={styles.listItemIcon} style={{
                    background: vencido ? 'rgba(244,63,94,.12)' : 'rgba(245,158,11,.10)',
                    color: vencido ? 'var(--r400)' : 'var(--a400)',
                  }}>
                    <i className={`ti ${vencido ? 'ti-alert-triangle' : 'ti-clock'}`} />
                  </div>
                  <div className={styles.listItemInfo}>
                    <span className={styles.listItemName}>{l.desc}</span>
                    <span className={styles.listItemSub}>
                      {l.data}
                      {vencido && <span style={{ color: 'var(--r400)', fontWeight: 600 }}> · vencida</span>}
                    </span>
                  </div>
                  <div className={styles.listItemRight}>
                    <span className={styles.listItemVal} style={{ color: 'var(--r400)' }}>
                      {fmt(l.valor)}
                    </span>
                    <Button small variant="success" onClick={() => dispatch({ type: 'PAGAR_COMPROMISSO', id: l.id })}>
                      Pagar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState message="Nenhum compromisso pendente" icon="ti-calendar-check" compact />
        )}
      </div>

      {/* ── Lançamentos recentes ──────────────── */}
      <div className={`col-12 ${styles.listCard}`}>
        <SectionTitle title="Lançamentos recentes" sub="Mês atual" />
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
          <EmptyState message="Nenhum lançamento neste mês" icon="ti-receipt" compact />
        )}
      </div>

    </div>
  )
}
