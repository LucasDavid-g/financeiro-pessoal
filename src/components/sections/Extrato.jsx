import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { PeriodFilter } from '../ui/PeriodFilter.jsx'
import { CAT_CONFIG } from '../../data/defaults.js'
import { getLancsDoPeriodo, getFixosTotal, getParcelasTotal } from '../../utils/calculators.js'
import { fmt } from '../../utils/formatters.js'
import { exportToCSV, exportToPDF } from '../../utils/csv.js'
import { contaLabel } from '../../utils/contaFilters.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import { PagarModal } from '../ui/PagarModal.jsx'
import { EditarLancamentoModal } from '../ui/EditarLancamentoModal.jsx'
import styles from './Extrato.module.css'

const SORT_OPTS = [
  { value: 'data-desc',  label: 'Mais recentes' },
  { value: 'data-asc',   label: 'Mais antigos'  },
  { value: 'valor-desc', label: 'Maior valor'   },
  { value: 'valor-asc',  label: 'Menor valor'   },
]

function KpiChip({ label, value, color, bg }) {
  return (
    <div className={styles.kpiChip} style={{ background: bg }}>
      <span className={styles.kpiChipLabel}>{label}</span>
      <span className={styles.kpiChipVal} style={{ color }}>{value}</span>
    </div>
  )
}

export function Extrato() {
  const { state, dispatch } = useApp()
  const { period, setPreset, setRange } = usePeriod()
  const { inicio, fim } = period

  const [busca,         setBusca]         = useState('')
  const [tipo,          setTipo]          = useState('')
  const [contaId,       setContaId]       = useState('')
  const [sort,          setSort]          = useState('data-desc')
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [pagando,       setPagando]       = useState(null)
  const [editando,      setEditando]      = useState(null)

  const filtered = useMemo(() => {
    let data = getLancsDoPeriodo(state.lancamentos, inicio, fim)
    if (tipo)    data = data.filter(l => l.tipo === tipo)
    if (contaId) data = data.filter(l => l.contaId === parseInt(contaId))
    if (busca)   data = data.filter(l => l.desc.toLowerCase().includes(busca.toLowerCase()))
    if (sort === 'data-asc')        data = [...data].sort((a, b) => a.data.localeCompare(b.data))
    else if (sort === 'valor-desc') data = [...data].sort((a, b) => b.valor - a.valor)
    else if (sort === 'valor-asc')  data = [...data].sort((a, b) => a.valor - b.valor)
    else                            data = [...data].sort((a, b) => b.data.localeCompare(a.data))
    return data
  }, [state.lancamentos, inicio, fim, tipo, contaId, busca, sort])

  const totalRec = filtered.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
  const totalDes = filtered.filter(l => l.tipo === 'despesa' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
  const totalPen = filtered.filter(l => l.status === 'pendente').reduce((s, l) => s + l.valor, 0)
  const totalInv = filtered.filter(l => l.tipo === 'investimento').reduce((s, l) => s + l.valor, 0)
  const saldoPer = totalRec - totalDes - totalInv

  // Relatório executivo
  const fixos    = getFixosTotal(state.fixos)
  const parcelas = getParcelasTotal(state.parcelas)

  const gastoCats = useMemo(() => {
    const cats = {}
    filtered.filter(l => l.tipo === 'despesa' && l.status !== 'pendente').forEach(l => {
      cats[l.cat || 'outros'] = (cats[l.cat || 'outros'] || 0) + l.valor
    })
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [filtered])

  // Agrupar por data
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(l => {
      if (!groups[l.data]) groups[l.data] = []
      groups[l.data].push(l)
    })
    return Object.entries(groups).sort(([a], [b]) => {
      if (sort === 'data-asc') return a.localeCompare(b)
      return b.localeCompare(a)
    })
  }, [filtered, sort])

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Extrato</h2>
          <p className={styles.pageSub}>{filtered.length} transações encontradas</p>
        </div>
        <div className={styles.exportBtns}>
          <Button variant="ghost" icon="ti-download" onClick={() => exportToCSV(state.lancamentos, state.contas, inicio, fim, {})}>CSV</Button>
          <Button variant="ghost" icon="ti-printer"  onClick={() => exportToPDF(state.lancamentos, state.contas, inicio, fim, {})}>PDF</Button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className={styles.periodWrap}>
        <PeriodFilter period={period} onPreset={setPreset} onRange={setRange} />
        <span className={styles.periodCount}>{filtered.length} lançamentos</span>
      </div>

      {/* KPI Strip */}
      <div className={styles.kpiRow}>
        <KpiChip label="Receitas"     value={`+${fmt(totalRec)}`} color="var(--g600)"  bg="var(--g50)" />
        <KpiChip label="Despesas"     value={`-${fmt(totalDes)}`} color="var(--r800)"  bg="var(--r50)" />
        {totalPen > 0 && <KpiChip label="Pendente"  value={fmt(totalPen)}    color="var(--a800)"  bg="var(--a50)" />}
        {totalInv > 0 && <KpiChip label="Investido" value={fmt(totalInv)}    color="var(--b800)"  bg="var(--b50)" />}
        <KpiChip
          label="Saldo"
          value={fmt(saldoPer)}
          color={saldoPer >= 0 ? 'var(--g600)' : 'var(--r800)'}
          bg={saldoPer >= 0 ? 'var(--g50)' : 'var(--r50)'}
        />
      </div>

      {/* Relatório executivo (colapsável) */}
      <div className={styles.relCard}>
        <button className={styles.relToggle} onClick={() => setShowRelatorio(r => !r)}>
          <span className={styles.relToggleText}>Relatório executivo</span>
          <i className={`ti ${showRelatorio ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
        </button>
        {showRelatorio && (
          <div className={styles.relBody}>
            <div className={styles.relGrid}>
              {[
                { label: 'Receitas',  value: fmt(totalRec),             color: 'var(--g400)' },
                { label: 'Despesas',  value: fmt(totalDes),             color: 'var(--r400)' },
                { label: 'Fixos (atual)',     value: fmt(fixos),    color: 'var(--color-text)' },
                { label: 'Parcelas (atual)', value: fmt(parcelas), color: 'var(--color-text)' },
                { label: 'Investido', value: fmt(totalInv),             color: 'var(--a400)' },
                { label: 'Saldo',     value: fmt(saldoPer),             color: saldoPer >= 0 ? 'var(--g400)' : 'var(--r400)' },
              ].map(item => (
                <div key={item.label} className={styles.relItem}>
                  <span className={styles.relLabel}>{item.label}</span>
                  <span className={styles.relVal} style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
            {gastoCats.length > 0 && (
              <div className={styles.catList}>
                <div className={styles.catListTitle}>Top categorias</div>
                {gastoCats.map(([cat, val]) => (
                  <div key={cat} className={styles.catListItem}>
                    <span>{cat}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--r400)', fontWeight: 600 }}>{fmt(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros de busca */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <i className="ti ti-search" />
            <input
              className={styles.searchInput}
              placeholder="Buscar por descrição..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={styles.filterSelect}>
            <option value="">Todos os tipos</option>
            <option value="despesa">Despesas</option>
            <option value="receita">Receitas</option>
            <option value="investimento">Investimentos</option>
          </select>
          <select value={contaId} onChange={e => setContaId(e.target.value)} className={styles.filterSelect}>
            <option value="">Todas as contas</option>
            {state.contas.map(c => <option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
          </select>
        </div>

        <div className={styles.sortRow}>
          {SORT_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              className={[styles.sortChip, sort === o.value ? styles.sortChipActive : ''].join(' ')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista agrupada por data */}
      {grouped.length > 0 ? grouped.map(([date, items]) => {
        const dayRec = items.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
        const dayDes = items.filter(l => l.tipo === 'despesa' && l.status !== 'pendente').reduce((s, l) => s + l.valor, 0)
        return (
          <div key={date} className={styles.dateGroup}>
            <div className={styles.dateGroupHeader}>
              <span className={styles.dateGroupDate}>{fmtDate(date)}</span>
              <div className={styles.dateGroupStats}>
                {dayRec > 0 && <span className={styles.dayRec}>+{fmt(dayRec)}</span>}
                {dayDes > 0 && <span className={styles.dayDes}>-{fmt(dayDes)}</span>}
              </div>
            </div>
            {items.map(l => {
              const cfg   = CAT_CONFIG[l.cat] || CAT_CONFIG[l.tipo] || CAT_CONFIG.outro
              const conta = state.contas.find(c => c.id === l.contaId)
              const isPend = l.status === 'pendente'
              return (
                <div key={l.id} className={[styles.lancItem, isPend ? styles.lancPend : '', isPend ? styles.lancItemWrap : ''].join(' ')}>
                  <div className={styles.lancIcon} style={{
                    background: isPend ? 'var(--a50)' : cfg.bg,
                    color: isPend ? 'var(--a400)' : cfg.color,
                  }}>
                    <i className={`ti ${isPend ? 'ti-clock' : cfg.icon}`} />
                  </div>
                  <div className={styles.lancInfo}>
                    <span className={styles.lancDesc}>
                      {l.desc}
                      {isPend && <Badge variant="a" style={{ marginLeft: 6 }}>pendente</Badge>}
                    </span>
                    <span className={styles.lancSub}>
                      {l.cat || l.tipo}{conta ? ' · ' + contaLabel(conta) : ''}
                    </span>
                  </div>
                  <div className={[styles.lancRight, isPend ? styles.lancRightPend : ''].join(' ')}>
                    <span className={styles.lancVal} style={{ color: l.tipo === 'receita' ? 'var(--g400)' : 'var(--r400)' }}>
                      {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                    </span>
                    <div className={styles.lancActions}>
                      {isPend && (
                        <button className={styles.pagarBtn} onClick={() => setPagando(l)}>
                          Pagar
                        </button>
                      )}
                      <button className={styles.delBtn} onClick={() => setEditando(l)} title="Editar">
                        <i className="ti ti-pencil" />
                      </button>
                      <button className={styles.delBtn} onClick={() => dispatch({ type: 'DEL_LANCAMENTO', id: l.id })}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }) : (
        <EmptyState message="Nenhum lançamento no período selecionado" icon="ti-receipt" />
      )}

      <PagarModal lancamento={pagando} onClose={() => setPagando(null)} />
      {editando && (
        <EditarLancamentoModal
          lancamento={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  )
}
