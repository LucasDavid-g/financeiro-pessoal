import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { CAT_CONFIG } from '../../data/defaults.js'
import { getLancsDoMes } from '../../utils/calculators.js'
import { fmt, getMonthKey } from '../../utils/formatters.js'
import { exportToCSV, exportToPDF } from '../../utils/csv.js'

const SORT_OPTS = [
  { value: 'data-desc',   label: 'Mais recentes' },
  { value: 'data-asc',    label: 'Mais antigos'  },
  { value: 'valor-desc',  label: 'Maior valor'   },
  { value: 'valor-asc',   label: 'Menor valor'   },
]

export function Extrato({ selYear, selMonth }) {
  const { state, dispatch } = useApp()
  const [busca,   setBusca]   = useState('')
  const [tipo,    setTipo]    = useState('')
  const [contaId, setContaId] = useState('')
  const [sort,    setSort]    = useState('data-desc')

  const filtered = useMemo(() => {
    let data = getLancsDoMes(state.lancamentos, selYear, selMonth)
    if (tipo)    data = data.filter((l) => l.tipo === tipo)
    if (contaId) data = data.filter((l) => l.contaId === parseInt(contaId))
    if (busca)   data = data.filter((l) => l.desc.toLowerCase().includes(busca.toLowerCase()))
    if (sort === 'data-asc')   data = [...data].sort((a, b) => a.data.localeCompare(b.data))
    else if (sort === 'valor-desc') data = [...data].sort((a, b) => b.valor - a.valor)
    else if (sort === 'valor-asc')  data = [...data].sort((a, b) => a.valor - b.valor)
    else data = [...data].sort((a, b) => b.data.localeCompare(a.data))
    return data
  }, [state.lancamentos, selYear, selMonth, tipo, contaId, busca, sort])

  const totalRec = filtered.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const totalDes = filtered.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <Card>
        <CardHeader title="Extrato" action={
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="ghost" icon="ti-download" onClick={() => exportToCSV(state.lancamentos, state.contas, selYear, selMonth, { tipo, contaId, busca, sort })}>CSV</Button>
          <Button variant="ghost" icon="ti-printer" onClick={() => exportToPDF(state.lancamentos, state.contas, selYear, selMonth, { tipo, contaId, busca, sort })}>PDF</Button>
        </div>
        } />
        <div style={{ marginBottom: '1rem' }}>
          <input placeholder="Buscar por descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="despesa">Despesas</option>
              <option value="receita">Receitas</option>
            </select>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">Todas as contas</option>
              {state.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {SORT_OPTS.map((o) => (
              <button key={o.value} onClick={() => setSort(o.value)}
                style={{ padding: '4px 10px', border: '0.5px solid', borderColor: sort === o.value ? 'var(--color-border2)' : 'var(--color-border)', borderRadius: 15, fontSize: 11, background: sort === o.value ? 'var(--color-surface2)' : 'transparent', color: sort === o.value ? 'var(--color-text)' : 'var(--color-text3)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, background: 'var(--g50)', color: 'var(--g800)', padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--font-mono)' }}>+{fmt(totalRec)}</div>
          <div style={{ fontSize: 12, background: 'var(--r50)', color: 'var(--r800)', padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--font-mono)' }}>-{fmt(totalDes)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text3)' }}>{filtered.length} lançamentos</div>
        </div>
        {filtered.length > 0 ? filtered.map((l) => {
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
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: l.tipo === 'receita' ? 'var(--g400)' : 'var(--r400)', flexShrink: 0 }}>
                {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
              </div>
              <button onClick={() => dispatch({ type: 'DEL_LANCAMENTO', id: l.id })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}>
                <i className="ti ti-trash" />
              </button>
            </div>
          )
        }) : <EmptyState message="Nenhum lançamento encontrado" />}
      </Card>
    </div>
  )
}
