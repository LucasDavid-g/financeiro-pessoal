import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { PeriodFilter } from '../ui/PeriodFilter.jsx'
import { ACCOUNT_COLORS, TIPO_LABEL } from '../../data/defaults.js'
import { contaOptions, contaLabel } from '../../utils/contaFilters.js'
import { getContaSaldo, getContaMesStats } from '../../utils/calculators.js'
import { fmt } from '../../utils/formatters.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import styles from './Contas.module.css'

const TIPO_ICONS = {
  corrente:     'ti-building-bank',
  digital:      'ti-device-mobile',
  cartao:       'ti-credit-card',
  investimento: 'ti-trending-up',
  poupanca:     'ti-piggy-bank',
}

const EMPTY_CONTA = { nome: '', tipo: 'corrente', saldo: '', cor: ACCOUNT_COLORS[0] }
const EMPTY_TR    = { desc: '', origemId: '', destinoId: '', valor: '', data: new Date().toISOString().slice(0, 10) }

export function Contas() {
  const { state, dispatch } = useApp()
  const { period: trPeriod, setPreset: setTrPreset, setRange: setTrRange } = usePeriod()
  const [contaModal, setContaModal] = useState(false)
  const [trModal,    setTrModal]    = useState(false)
  const [contaForm,  setContaForm]  = useState({ ...EMPTY_CONTA, editId: null })
  const [trForm,     setTrForm]     = useState({ ...EMPTY_TR })
  const setC = (k, v) => setContaForm(f => ({ ...f, [k]: v }))
  const setT = (k, v) => setTrForm(f => ({ ...f, [k]: v }))

  // Mês atual para stats das contas
  const now = new Date()
  const selYear  = now.getFullYear()
  const selMonth = now.getMonth() + 1

  const patrimonio = state.contas.reduce((s, c) => s + getContaSaldo(state, c.id), 0)

  const saveConta = () => {
    if (!contaForm.nome) return alert('Informe o nome.')
    const payload = { nome: contaForm.nome, tipo: contaForm.tipo, saldo: parseFloat(contaForm.saldo) || 0, cor: contaForm.cor }
    if (contaForm.editId) dispatch({ type: 'EDIT_CONTA', payload: { ...payload, id: contaForm.editId } })
    else dispatch({ type: 'ADD_CONTA', payload })
    setContaModal(false)
    setContaForm({ ...EMPTY_CONTA, editId: null })
  }

  const saveTransfer = () => {
    const oId = parseInt(trForm.origemId), dId = parseInt(trForm.destinoId)
    if (!trForm.valor || !trForm.data || oId === dId) return alert('Verifique os dados.')
    dispatch({ type: 'ADD_TRANSFER', payload: { desc: trForm.desc, origemId: oId, destinoId: dId, valor: parseFloat(trForm.valor), data: trForm.data } })
    setTrModal(false)
    setTrForm({ ...EMPTY_TR })
  }

  const editConta = (c) => {
    setContaForm({ nome: c.nome, tipo: c.tipo, saldo: c.saldo, cor: c.cor, editId: c.id })
    setContaModal(true)
  }

  const deleteConta = (c) => {
    const temLancs = state.lancamentos.some(l => l.contaId === c.id)
    const temTrans = state.transferencias.some(t => t.origemId === c.id || t.destinoId === c.id)
    const temFixos = state.fixos.some(f => f.contaId === c.id)
    const linhas   = [`Excluir a conta "${c.nome}"?`]
    if (temLancs || temTrans || temFixos) {
      linhas.push('\nATENÇÃO: também serão removidos:')
      if (temLancs) linhas.push('• Todos os lançamentos vinculados')
      if (temTrans) linhas.push('• Transferências que envolvem esta conta')
      if (temFixos) linhas.push('• Vínculo de recorrentes')
    }
    if (window.confirm(linhas.join('\n'))) dispatch({ type: 'DEL_CONTA', id: c.id })
  }

  const transfers      = state.transferencias.filter(t => t.data >= trPeriod.inicio && t.data <= trPeriod.fim)
  const opcoesTransfer = contaOptions(state.contas, 'transferencia')

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Minhas contas</h2>
          <p className={styles.pageSub}>
            Patrimônio total: <span className={styles.patrimonioVal}>{fmt(patrimonio)}</span>
          </p>
        </div>
        <div className={styles.pageActions}>
          <Button variant="ghost" icon="ti-arrow-left-right" onClick={() => setTrModal(true)}>Transferir</Button>
          <Button variant="primary" icon="ti-plus" onClick={() => { setContaForm({ ...EMPTY_CONTA, editId: null }); setContaModal(true) }}>Nova conta</Button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className={styles.kpiStrip}>
        {[
          { label: 'Contas ativas', val: state.contas.length, icon: 'ti-building-bank', color: 'var(--b400)' },
          { label: 'Maior saldo',   val: fmt(Math.max(0, ...state.contas.map(c => getContaSaldo(state, c.id)))), icon: 'ti-arrow-up', color: 'var(--g400)' },
          { label: 'Investimentos', val: fmt(state.contas.filter(c => ['investimento','poupanca'].includes(c.tipo)).reduce((s,c) => s + getContaSaldo(state,c.id), 0)), icon: 'ti-trending-up', color: 'var(--p400)' },
        ].map(k => (
          <div key={k.label} className={styles.kpiItem}>
            <div className={styles.kpiIcon} style={{ color: k.color, background: k.color + '18' }}>
              <i className={`ti ${k.icon}`} />
            </div>
            <div>
              <div className={styles.kpiVal}>{k.val}</div>
              <div className={styles.kpiLabel}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de contas */}
      {state.contas.length > 0 ? (
        <div className={styles.contasGrid}>
          {state.contas.map(c => {
            const saldo = getContaSaldo(state, c.id)
            const stats = getContaMesStats(state, c.id, selYear, selMonth)
            const pct   = patrimonio > 0 ? Math.round((saldo / patrimonio) * 100) : 0
            const icon  = TIPO_ICONS[c.tipo] || 'ti-building-bank'
            return (
              <div key={c.id} className={styles.contaCard}>
                <div className={styles.contaAccent} style={{ background: c.cor }} />

                <div className={styles.contaTop}>
                  <div className={styles.contaIconWrap} style={{ background: c.cor + '20', color: c.cor }}>
                    <i className={`ti ${icon}`} />
                  </div>
                  <div className={styles.contaActions}>
                    <button className={styles.actionBtn} onClick={() => editConta(c)} title="Editar">
                      <i className="ti ti-pencil" />
                    </button>
                    <button className={styles.actionBtn} onClick={() => deleteConta(c)} title="Excluir">
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>

                <div className={styles.contaName}>{c.nome}</div>
                <div className={styles.contaTipo}>{TIPO_LABEL[c.tipo] || c.tipo}</div>

                <div className={styles.contaSaldo} style={{ color: saldo >= 0 ? 'var(--g400)' : 'var(--r400)' }}>
                  {fmt(saldo)}
                </div>

                {/* Barra de participação no patrimônio */}
                <div className={styles.participacao}>
                  <div className={styles.participacaoBar}>
                    <div className={styles.participacaoFill} style={{ width: `${Math.max(0, pct)}%`, background: c.cor }} />
                  </div>
                  <span className={styles.participacaoPct}>{pct}% do patrimônio</span>
                </div>

                {/* Stats do mês */}
                <div className={styles.contaStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Entradas</span>
                    <span className={styles.statVal} style={{ color: 'var(--g400)' }}>{fmt(stats.entrada)}</span>
                  </div>
                  <div className={styles.statDivider} />
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Saídas</span>
                    <span className={styles.statVal} style={{ color: 'var(--r400)' }}>{fmt(stats.saida)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState message="Nenhuma conta cadastrada ainda." icon="ti-building-bank" />
      )}

      {/* Transferências */}
      <div className={styles.transSection}>
        <div className={styles.transSectionHeader}>
          <h3 className={styles.transSectionTitle}>Transferências</h3>
          <PeriodFilter period={trPeriod} onPreset={setTrPreset} onRange={setTrRange} align="right" />
        </div>
        {transfers.length > 0 ? (
          <div className={styles.transList}>
            {transfers.slice().reverse().map(t => {
              const orig = state.contas.find(c => c.id === t.origemId)
              const dest = state.contas.find(c => c.id === t.destinoId)
              return (
                <div key={t.id} className={styles.transItem}>
                  <div className={styles.transIcon}>
                    <i className="ti ti-arrow-left-right" />
                  </div>
                  <div className={styles.transInfo}>
                    <span className={styles.transDesc}>{t.desc || 'Transferência'}</span>
                    <span className={styles.transSub}>
                      {orig ? contaLabel(orig) : '?'} → {dest ? contaLabel(dest) : '?'} · {t.data}
                    </span>
                  </div>
                  <span className={styles.transVal}>{fmt(t.valor)}</span>
                  <button className={styles.actionBtn} onClick={() => dispatch({ type: 'DEL_TRANSFER', id: t.id })}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState message="Nenhuma transferência no período selecionado" icon="ti-arrow-left-right" compact />
        )}
      </div>

      {/* Modal Conta */}
      <Modal open={contaModal} onClose={() => setContaModal(false)} title={contaForm.editId ? 'Editar conta' : 'Nova conta'}>
        <FormGroup label="Nome"><input value={contaForm.nome} onChange={e => setC('nome', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="Tipo">
            <select value={contaForm.tipo} onChange={e => setC('tipo', e.target.value)}>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Saldo inicial (R$)">
            <input type="number" step="0.01" value={contaForm.saldo} onChange={e => setC('saldo', e.target.value)} />
          </FormGroup>
        </FormRow>
        <FormGroup label="Cor da conta">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {ACCOUNT_COLORS.map(cor => (
              <div key={cor} onClick={() => setC('cor', cor)} style={{
                width: 28, height: 28, borderRadius: '50%', background: cor,
                cursor: 'pointer', border: `3px solid ${contaForm.cor === cor ? 'var(--color-text)' : 'transparent'}`,
                transition: 'border-color .15s',
              }} />
            ))}
          </div>
        </FormGroup>
        <Button variant="primary" fullWidth onClick={saveConta}>Salvar conta</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => setContaModal(false)}>Cancelar</Button>
      </Modal>

      {/* Modal Transferência */}
      <Modal open={trModal} onClose={() => setTrModal(false)} title="Nova transferência">
        <FormGroup label="Descrição"><input value={trForm.desc} onChange={e => setT('desc', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="De">
            <select value={trForm.origemId} onChange={e => setT('origemId', e.target.value)}>
              <option value="">Selecione</option>
              {opcoesTransfer.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Para">
            <select value={trForm.destinoId} onChange={e => setT('destinoId', e.target.value)}>
              <option value="">Selecione</option>
              {opcoesTransfer.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Valor (R$)"><input type="number" step="0.01" value={trForm.valor} onChange={e => setT('valor', e.target.value)} /></FormGroup>
          <FormGroup label="Data"><input type="date" value={trForm.data} onChange={e => setT('data', e.target.value)} /></FormGroup>
        </FormRow>
        <Button variant="primary" fullWidth onClick={saveTransfer}>Registrar transferência</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => setTrModal(false)}>Cancelar</Button>
      </Modal>
    </div>
  )
}
