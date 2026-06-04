import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { useApp } from '../../context/AppContext.jsx'
import { getMesData, getLancsDoMes, getTaxaPoupanca, getDiasReserva, getBurnRate } from '../../utils/calculators.js'
import { fmt, getPastMonths, monthLabel } from '../../utils/formatters.js'
import { MONTHS_FULL } from '../../data/defaults.js'
import { CAT_CONFIG, MONTHS_FULL as MF } from '../../data/defaults.js'
import { Card, CardHeader } from '../ui/Card.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'

export function Insights({ selYear, selMonth }) {
  const { state } = useApp()
  const meses6 = getPastMonths(selYear, selMonth, 6)

  const taxaPoupancaAtual = getTaxaPoupanca(state, selYear, selMonth)
  const diasReserva       = getDiasReserva(state)
  const burnRate          = getBurnRate(state)
  const d                 = getMesData(state, selYear, selMonth)

  const taxasPoupanca = meses6.map(({ year, month }) => getTaxaPoupanca(state, year, month))
  const labels6       = meses6.map(({ year, month }) => monthLabel(year, month))

  const poupancaData = {
    labels: labels6,
    datasets: [{ label: 'Taxa de poupança (%)', data: taxasPoupanca, borderColor: '#1D9E75', backgroundColor: '#1D9E7515', tension: .4, pointRadius: 4, fill: true, borderWidth: 2.5 }],
  }

  const catMedia = useMemo(() => {
    const acc = {}
    meses6.forEach(({ year, month }) => {
      getLancsDoMes(state.lancamentos, year, month).filter((l) => l.tipo === 'despesa').forEach((l) => {
        acc[l.cat] = acc[l.cat] || { sum: 0 }
        acc[l.cat].sum += l.valor
      })
    })
    return Object.entries(acc).map(([cat, { sum }]) => ({ cat, media: sum / meses6.length })).sort((a, b) => b.media - a.media)
  }, [state.lancamentos, selYear, selMonth])

  const catVariacao = useMemo(() => {
    let maxVar = 0, catMaxVar = '', maxVarMedia = 0
    const catSet = {}
    meses6.forEach(({ year, month }) => {
      getLancsDoMes(state.lancamentos, year, month).filter((l) => l.tipo === 'despesa').forEach((l) => {
        catSet[l.cat] = catSet[l.cat] || []
        catSet[l.cat].push(l.valor)
      })
    })
    Object.entries(catSet).forEach(([cat, vals]) => {
      if (vals.length < 2) return
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length
      const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length)
      if (std > maxVar) { maxVar = std; catMaxVar = cat; maxVarMedia = avg }
    })
    return { cat: catMaxVar, variacao: maxVar, media: maxVarMedia }
  }, [state.lancamentos, selYear, selMonth])

  const exportRelatorio = () => {
    const meses3 = getPastMonths(selYear, selMonth, 3)
    const mediaGastos3 = meses3.reduce((s, { year, month }) => s + getMesData(state, year, month).totalSaidas, 0) / 3
    const cats = {}
    getLancsDoMes(state.lancamentos, selYear, selMonth).filter((l) => l.tipo === 'despesa').forEach((l) => { cats[l.cat] = (cats[l.cat] || 0) + l.valor })
    if (d.fixos > 0) cats['Recorrentes'] = d.fixos
    if (d.parcelas > 0) cats['Parcelas'] = d.parcelas
    const top3 = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3)

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório ${MF[selMonth]} ${selYear}</title>
    <style>body{font-family:monospace;max-width:600px;margin:40px auto;padding:20px;background:#fafaf9;color:#1a1917;}h1{font-size:18px;border-bottom:1px solid #e8e6e0;padding-bottom:10px;margin-bottom:20px;}h2{font-size:13px;text-transform:uppercase;color:#8a8780;margin-bottom:10px;}.row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;}.saldo{color:${d.saldo >= 0 ? '#1D9E75' : '#E24B4A'};}section{margin-bottom:24px;}</style></head>
    <body><h1>RELATÓRIO — ${MF[selMonth].toUpperCase()} ${selYear}</h1>
    <section><h2>Resumo</h2><div class="row"><span>Receitas:</span><span>${fmt(d.receitas)}</span></div><div class="row"><span>Gastos:</span><span>${fmt(d.totalSaidas)}</span></div><div class="row saldo"><span>Saldo:</span><span>${fmt(d.saldo)}</span></div></section>
    <section><h2>Indicadores</h2><div class="row"><span>Taxa poupança:</span><span>${taxaPoupancaAtual}%</span></div><div class="row"><span>Dias de reserva:</span><span>${Math.round(diasReserva)}</span></div><div class="row"><span>Reserva:</span><span>${fmt(state.reserva)}</span></div></section>
    <section><h2>Top 3 categorias</h2>${top3.map(([cat, val]) => `<div class="row"><span>${cat}:</span><span>${fmt(val)}</span></div>`).join('')}</section>
    </body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `relatorio-${selYear}-${String(selMonth + 1).padStart(2, '0')}.html`
    a.click(); URL.revokeObjectURL(url)
  }

  const exportRelatorioCSV = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Receitas', d.receitas.toFixed(2)],
      ['Despesas', d.despesas.toFixed(2)],
      ['Recorrentes', d.fixos.toFixed(2)],
      ['Parcelas', d.parcelas.toFixed(2)],
      ['Investimentos', d.invest.toFixed(2)],
      ['Saldo', d.saldo.toFixed(2)],
      ['Taxa poupança (%)', taxaPoupancaAtual],
      ['Dias de reserva', Math.round(diasReserva)],
      ['Burn rate/dia', burnRate.toFixed(2)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `relatorio-${selYear}-${String(selMonth+1).padStart(2,'0')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const insightBoxStyle = { background: 'var(--color-surface2)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
        <div style={insightBoxStyle}>
          <div style={{ fontSize: 11, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Taxa de poupança</div>
          <div style={{ fontSize: 24, fontWeight: 500, fontFamily: 'var(--font-mono)', margin: '.5rem 0', color: taxaPoupancaAtual >= 15 ? 'var(--g400)' : 'var(--r400)' }}>{taxaPoupancaAtual}%</div>
          <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{taxaPoupancaAtual >= 15 ? 'saudável' : 'abaixo do ideal'}</div>
        </div>
        <div style={insightBoxStyle}>
          <div style={{ fontSize: 11, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Meses de reserva</div>
          <div style={{ fontSize: 24, fontWeight: 500, fontFamily: 'var(--font-mono)', margin: '.5rem 0' }}>{(diasReserva / 30).toFixed(1)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{Math.round(diasReserva)} dias de autonomia</div>
        </div>
        <div style={insightBoxStyle}>
          <div style={{ fontSize: 11, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Burn rate</div>
          <div style={{ fontSize: 24, fontWeight: 500, fontFamily: 'var(--font-mono)', margin: '.5rem 0' }}>{fmt(burnRate)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>gasto diário médio</div>
        </div>
        <div style={insightBoxStyle}>
          <div style={{ fontSize: 11, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Gasto total/dia</div>
          <div style={{ fontSize: 24, fontWeight: 500, fontFamily: 'var(--font-mono)', margin: '.5rem 0' }}>{fmt(d.totalSaidas / 30)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>com fixos incluídos</div>
        </div>
      </div>

      <Card>
        <CardHeader title="Evolução da poupança — 6 meses" />
        <div style={{ height: 200 }}>
          <Line data={poupancaData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, ticks: { callback: (v) => v + '%', font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' } } } }} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Gastos por categoria — média mensal" />
        {catMedia.length > 0 ? catMedia.map(({ cat, media }) => {
          const cfg = CAT_CONFIG[cat] || CAT_CONFIG.outro
          return (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}><i className={`ti ${cfg.icon}`} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{cat}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--r400)' }}>{fmt(media)}</div>
            </div>
          )
        }) : <EmptyState message="Sem dados suficientes (mínimo 1 lançamento)" />}
      </Card>

      <Card>
        <CardHeader title="Categoria com maior variação" />
        {catVariacao.cat ? (() => {
          const cfg = CAT_CONFIG[catVariacao.cat] || CAT_CONFIG.outro
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}><i className={`ti ${cfg.icon}`} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{catVariacao.cat}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>Variação: {fmt(catVariacao.variacao)} · Média: {fmt(catVariacao.media)}</div>
              </div>
            </div>
          )
        })() : <EmptyState message="Sem variação detectada" />}
      </Card>

      <Card>
  <CardHeader
    title={`Relatório executivo — ${MF[selMonth]} ${selYear}`}
    action={
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={exportRelatorio} style={{ background: 'transparent', border: '0.5px solid var(--color-border2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--color-text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-printer" /> PDF
        </button>
        <button onClick={exportRelatorioCSV} style={{ background: 'transparent', border: '0.5px solid var(--color-border2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'var(--color-text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-download" /> CSV
        </button>
      </div>
    }
  />
  <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}>
    <div style={{ fontWeight: 500, marginBottom: '1rem', fontSize: 13, borderBottom: '0.5px solid var(--color-border)', paddingBottom: '0.5rem' }}>RESUMO — {MF[selMonth].toUpperCase()} {selYear}</div>
    {[['Receitas', fmt(d.receitas)],['Despesas', fmt(d.despesas)],['Recorrentes', fmt(d.fixos)],['Parcelas', fmt(d.parcelas)],['Investimentos', fmt(d.invest)]].map(([k, v]) => (
      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}><span>{k}:</span><span>{v}</span></div>
    ))}
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 3px', marginTop: 6, borderTop: '0.5px solid var(--color-border)', fontWeight: 500, fontSize: 11 }}>
      <span>Saldo:</span><span style={{ color: d.saldo >= 0 ? 'var(--g400)' : 'var(--r400)' }}>{fmt(d.saldo)}</span>
    </div>
    <div style={{ marginTop: '1rem', borderTop: '0.5px solid var(--color-border)', paddingTop: '1rem' }}>
      {[['Taxa poupança', taxaPoupancaAtual + '%'],['Meses de reserva', (diasReserva / 30).toFixed(1)],['Burn rate/dia', fmt(burnRate)]].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}><span>{k}:</span><span>{v}</span></div>
      ))}
    </div>
  </div>
</Card>
    </div>
  )
}
