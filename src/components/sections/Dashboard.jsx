import { useMemo } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip } from 'chart.js'
import { useApp } from '../../context/AppContext.jsx'
import { getMesData, getLancsDoMes, getFixosTotal, getParcelasTotal } from '../../utils/calculators.js'
import { fmt, getPastMonths, monthLabel } from '../../utils/formatters.js'
import { CAT_CONFIG } from '../../data/defaults.js'
import { MetricCard } from '../ui/MetricCard.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { Alert } from '../ui/Alert.jsx'
import { Badge } from '../ui/Badge.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip)

export function Dashboard({ selYear, selMonth }) {
  const { state } = useApp()
  const d = useMemo(() => getMesData(state, selYear, selMonth), [state, selYear, selMonth])

  const pct = d.receitas > 0 ? Math.round((d.saldo / d.receitas) * 100) : 0

  const meses13 = getPastMonths(selYear, selMonth, 13)
  const labels13 = meses13.map(({ year, month }) => monthLabel(year, month))
  const recArr   = meses13.map(({ year, month }) => getLancsDoMes(state.lancamentos, year, month).filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0))
  const gasArr   = meses13.map(({ year, month }) => getLancsDoMes(state.lancamentos, year, month).filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0) + getFixosTotal(state.fixos) + getParcelasTotal(state.parcelas))

  const evolucaoData = {
    labels: labels13,
    datasets: [
      { label: 'Receita', data: recArr, borderColor: '#1D9E75', backgroundColor: '#1D9E7515', tension: .35, pointRadius: 3, fill: true, borderWidth: 2 },
      { label: 'Gastos',  data: gasArr, borderColor: '#E24B4A', backgroundColor: '#E24B4A10', tension: .35, pointRadius: 3, fill: true, borderWidth: 2, borderDash: [4, 3] },
    ],
  }

  const cats = {}
  getLancsDoMes(state.lancamentos, selYear, selMonth).filter((l) => l.tipo === 'despesa').forEach((l) => { cats[l.cat] = (cats[l.cat] || 0) + l.valor })
  if (d.fixos > 0) cats.fixos = d.fixos
  if (d.parcelas > 0) cats.parcelas = d.parcelas
  const catLabels = Object.keys(cats)
  const catVals   = Object.values(cats)
  const catColors = catLabels.map((l) => (CAT_CONFIG[l] || CAT_CONFIG.outro).color)
  const catTotal  = catVals.reduce((a, b) => a + b, 0)

  const pizzaData = { labels: catLabels, datasets: [{ data: catVals, backgroundColor: catColors, borderWidth: 0, hoverOffset: 3 }] }

  const recent = getLancsDoMes(state.lancamentos, selYear, selMonth).slice(-5).reverse()

  const parcelasTerminando = state.parcelas.filter((p) => p.total !== 999 && (p.atual + 1) >= p.total - 1)

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
        <MetricCard label="Saldo disponível" value={fmt(d.saldo)} sub={d.receitas > 0 ? `${pct}% da receita` : '—'} accent="green" valueColor={d.saldo >= 0 ? 'var(--g400)' : 'var(--r400)'} />
        <MetricCard label="Total de gastos"  value={fmt(d.totalSaidas)} accent="red"   valueColor="var(--r400)" />
        <MetricCard label="Receitas"          value={fmt(d.receitas)}   accent="blue"  />
        <MetricCard label="Investido"         value={fmt(state.reserva)} sub={state.investType} accent="amber" valueColor="var(--a400)" />
      </div>

      {d.saldo < 0      && <Alert variant="danger">Gastos superam receita em {fmt(Math.abs(d.saldo))}</Alert>}
      {d.saldo >= 0 && d.receitas > 0 && pct < 15 && <Alert variant="warn">Saldo abaixo de 15% da receita</Alert>}
      {d.saldo >= 0 && d.receitas > 0 && pct >= 15 && <Alert variant="ok">Mês equilibrado — {pct}% disponível</Alert>}

      {parcelasTerminando.length > 0 && (
        <Card>
          <CardHeader title="Parcelas terminando" />
          {parcelasTerminando.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FCEBEB', color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                <i className="ti ti-alert-triangle" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: 1 }}>{p.cartao} · termina em {p.total - p.atual} parcelas</div>
              </div>
              <Badge variant="a">próximo</Badge>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <CardHeader title="Evolução — 13 meses" />
        <div style={{ height: 180 }}>
          <Line data={evolucaoData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 45, autoSkip: false }, grid: { display: false } }, y: { ticks: { callback: (v) => 'R$' + v.toLocaleString('pt-BR'), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' } } } }} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Distribuição do mês" />
        {catVals.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ height: 140, width: 140, flexShrink: 0 }}>
              <Doughnut data={pizzaData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '68%' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {catLabels.map((l, i) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: catColors[i], flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text2)' }}>{l}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text3)' }}>{Math.round(catVals[i] / catTotal * 100)}%</div>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState message="Sem gastos lançados neste mês" />}
      </Card>

      <Card>
        <CardHeader title="Lançamentos recentes" />
        {recent.length > 0 ? recent.map((l) => {
          const cfg   = CAT_CONFIG[l.cat] || CAT_CONFIG[l.tipo] || CAT_CONFIG.outro
          const conta = state.contas.find((c) => c.id === l.contaId)
          return (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                <i className={`ti ${cfg.icon}`} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{l.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: 1 }}>{l.data}{conta ? ' · ' + conta.nome : ''}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: l.tipo === 'receita' ? 'var(--g400)' : 'var(--r400)' }}>
                {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
              </div>
            </div>
          )
        }) : <EmptyState message="Sem lançamentos neste mês" />}
      </Card>
    </div>
  )
}
