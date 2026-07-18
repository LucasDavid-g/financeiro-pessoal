import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { ProgressBar } from '../ui/ProgressBar.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { fmt } from '../../utils/formatters.js'
import { MONTHS_FULL } from '../../data/defaults.js'
import { getContaSaldo } from '../../utils/calculators.js'
import styles from './Metas.module.css'

const EMPTY_FORM = { nome: '', valor: '', atual: '', mensal: '250', contaId: '' }

// Retorna o saldo atual de uma meta — da conta vinculada (se houver) ou do campo manual
const getAtualMeta = (state, meta) => {
  if (meta.contaId) {
    const saldo = getContaSaldo(state, meta.contaId)
    return Math.max(0, saldo)   // só positivo — cartão teria saldo negativo
  }
  return meta.atual
}

function calcMeta(valor, atual, mensal) {
  const v = parseFloat(valor) || 0
  const a = parseFloat(atual) || 0
  const m = parseFloat(mensal) || 0
  const falta = Math.max(0, v - a)
  const meses = m > 0 ? Math.ceil(falta / m) : 0
  const pct   = v > 0 ? Math.min(100, Math.round((a / v) * 100)) : 0
  const dataEst = (() => { const d = new Date(); d.setMonth(d.getMonth() + meses); return d })()
  return { v, a, m, falta, meses, pct, dataEst }
}

export function Metas() {
  const { state, dispatch } = useApp()

  // Contas de investimento / poupança disponíveis para vincular
  const contasInvest = state.contas.filter(c => ['investimento', 'poupanca', 'digital', 'corrente'].includes(c.tipo))

  // Simulador / form de criação
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Se houver conta vinculada no formulário, "atual" vem do saldo da conta
  const atualSimulado = form.contaId
    ? Math.max(0, getContaSaldo(state, parseInt(form.contaId)))
    : parseFloat(form.atual) || 0

  // Modal de edição
  const [editMeta, setEditMeta] = useState(null)   // meta sendo editada
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const atualEdit = editForm.contaId
    ? Math.max(0, getContaSaldo(state, parseInt(editForm.contaId)))
    : parseFloat(editForm.atual) || 0

  // Preview do simulador (usa atual derivado)
  const sim = calcMeta(form.valor, atualSimulado, form.mensal)

  const [errNova,  setErrNova]  = useState('')
  const [errEdit,  setErrEdit]  = useState('')

  const salvar = () => {
    if (!form.nome || !(parseFloat(form.valor) > 0)) return setErrNova('Preencha nome e um valor de meta maior que zero.')
    setErrNova('')
    dispatch({
      type: 'ADD_META',
      payload: {
        nome:    form.nome,
        valor:   sim.v,
        atual:   sim.a,
        mensal:  sim.m,
        contaId: form.contaId ? parseInt(form.contaId) : null,
      },
    })
    setForm({ ...EMPTY_FORM })
  }

  const abrirEdicao = (m) => {
    setEditMeta(m)
    setEditForm({
      nome:    m.nome,
      valor:   String(m.valor),
      atual:   String(m.atual),
      mensal:  String(m.mensal),
      contaId: m.contaId ? String(m.contaId) : '',
    })
  }

  const salvarEdicao = () => {
    if (!editForm.nome || !(parseFloat(editForm.valor) > 0)) return setErrEdit('Preencha nome e um valor de meta maior que zero.')
    setErrEdit('')
    const { v, m } = calcMeta(editForm.valor, atualEdit, editForm.mensal)
    dispatch({
      type: 'EDIT_META',
      payload: {
        id:      editMeta.id,
        nome:    editForm.nome,
        valor:   v,
        atual:   atualEdit,
        mensal:  m,
        contaId: editForm.contaId ? parseInt(editForm.contaId) : null,
      },
    })
    setEditMeta(null)
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Metas</h2>
          <p className={styles.pageSub}>{state.metas.length} meta{state.metas.length !== 1 ? 's' : ''} cadastrada{state.metas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* KPI strip de progresso geral */}
      {state.metas.length > 0 && (() => {
        const totalValor  = state.metas.reduce((s, m) => s + m.valor, 0)
        const totalAtual  = state.metas.reduce((s, m) => s + getAtualMeta(state, m), 0)
        const totalMensal = state.metas.reduce((s, m) => s + m.mensal, 0)
        const pctGeral    = totalValor > 0 ? Math.round((totalAtual / totalValor) * 100) : 0
        const concluidas  = state.metas.filter(m => getAtualMeta(state, m) >= m.valor).length
        return (
          <div className={styles.kpiStrip}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Total acumulado</span>
              <span className={styles.kpiVal}>{fmt(totalAtual)}</span>
              <span className={styles.kpiSub}>de {fmt(totalValor)}</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Progresso geral</span>
              <span className={styles.kpiVal} style={{ color: pctGeral >= 100 ? 'var(--g400)' : 'var(--color-text)' }}>{pctGeral}%</span>
              <span className={styles.kpiSub}>{concluidas} concluída{concluidas !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiLabel}>Comprometido mensal</span>
              <span className={styles.kpiVal}>{fmt(totalMensal)}</span>
              <span className={styles.kpiSub}>para todas as metas</span>
            </div>
          </div>
        )
      })()}

      {/* Simulador */}
      <div className={styles.simCard}>
        <div className={styles.simHeader}>
          <i className="ti ti-calculator" style={{ color: 'var(--g400)', fontSize: 16 }} />
          <span className={styles.simTitle}>Simulador</span>
        </div>

        <FormGroup label="Nome da meta">
          <input placeholder="ex: Viagem, Notebook, Reserva..." value={form.nome} onChange={e => set('nome', e.target.value)} />
        </FormGroup>
        <FormRow>
          <FormGroup label="Valor total (R$)">
            <input type="number" placeholder="0" value={form.valor} onChange={e => set('valor', e.target.value)} />
          </FormGroup>
          <FormGroup label={form.contaId ? 'Saldo atual (automático)' : 'Já tenho (R$)'}>
            <input
              type="number"
              placeholder="0"
              value={form.contaId ? String(atualSimulado.toFixed(2)) : form.atual}
              onChange={e => set('atual', e.target.value)}
              disabled={!!form.contaId}
              style={form.contaId ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Poupar por mês (R$)">
            <input type="number" placeholder="250" value={form.mensal} onChange={e => set('mensal', e.target.value)} />
          </FormGroup>
          <FormGroup label="Conta vinculada (opcional)">
            <select value={form.contaId} onChange={e => set('contaId', e.target.value)}>
              <option value="">— manual —</option>
              {contasInvest.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        {form.contaId && (
          <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,.08)', color: 'var(--g400)', marginBottom: 2 }}>
            <i className="ti ti-link" style={{ marginRight: 6 }} />
            Saldo atual lido automaticamente da conta selecionada: <strong>{fmt(atualSimulado)}</strong>
          </div>
        )}

        {sim.v > 0 && sim.m > 0 && (
          <div className={styles.simPreview}>
            <div className={styles.simPreviewLabel}>Você consegue em</div>
            <div className={styles.simPreviewVal}>{sim.meses} {sim.meses === 1 ? 'mês' : 'meses'}</div>
            <div className={styles.simPreviewEst}>
              Estimativa: {MONTHS_FULL[sim.dataEst.getMonth()]} {sim.dataEst.getFullYear()}
            </div>
            <ProgressBar pct={sim.pct} />
            <div className={styles.simPreviewSub}>{sim.pct}% acumulado · faltam {fmt(sim.falta)}</div>
          </div>
        )}

        {errNova && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{errNova}</p>}
        <Button variant="primary" fullWidth icon="ti-bookmark" onClick={salvar}>Salvar meta</Button>
      </div>

      {/* Lista de metas */}
      {state.metas.length > 0 ? (
        <div className={styles.metasList}>
          {state.metas.map(m => {
            const atualVivo = getAtualMeta(state, m)
            const contaVinc = m.contaId ? state.contas.find(c => c.id === m.contaId) : null
            const { falta, meses, pct } = calcMeta(m.valor, atualVivo, m.mensal)
            const msLabel = meses > 0 ? `${meses} ${meses === 1 ? 'mês' : 'meses'}` : '?'
            return (
              <div key={m.id} className={styles.metaCard}>
                <div className={styles.metaTop}>
                  <div className={styles.metaIcon}>
                    <i className="ti ti-target" />
                  </div>
                  <div className={styles.metaInfo}>
                    <span className={styles.metaNome}>{m.nome}</span>
                    <span className={styles.metaSub}>
                      Meta: {fmt(m.valor)} · {fmt(m.mensal)}/mês · {msLabel}
                      {contaVinc && <span style={{ color: 'var(--g400)', marginLeft: 6 }}><i className="ti ti-link" style={{ fontSize: 10 }} /> {contaVinc.nome}</span>}
                    </span>
                  </div>
                  <div className={styles.metaActions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => abrirEdicao(m)}
                      title="Editar meta"
                    >
                      <i className="ti ti-pencil" />
                    </button>
                    <button
                      className={styles.delBtn}
                      onClick={() => dispatch({ type: 'DEL_META', id: m.id })}
                      title="Excluir meta"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>

                <div className={styles.metaValores}>
                  <span className={styles.metaAtual}>{fmt(atualVivo)}</span>
                  <span className={styles.metaPct}>{pct}%</span>
                  <span className={styles.metaTotal}>{fmt(m.valor)}</span>
                </div>

                <ProgressBar pct={pct} />

                <div className={styles.metaFoot}>
                  <span className={styles.metaFalta}>
                    {pct >= 100 ? 'Meta atingida!' : `Faltam ${fmt(falta)}`}
                    {contaVinc && <span style={{ color: 'var(--color-text3)', marginLeft: 6, fontSize: 10 }}>· saldo ao vivo</span>}
                  </span>
                  {pct >= 100 && <span className={styles.metaConcluida}><i className="ti ti-check" /> Concluída!</span>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState message="Nenhuma meta. Use o simulador acima." icon="ti-target" />
      )}

      {/* Modal de edição */}
      {editMeta && (
        <Modal open={!!editMeta} onClose={() => setEditMeta(null)} title={`Editar: ${editMeta.nome}`}>
          <FormGroup label="Nome da meta">
            <input value={editForm.nome} onChange={e => setE('nome', e.target.value)} />
          </FormGroup>
          <FormRow>
            <FormGroup label="Valor total (R$)">
              <input type="number" step="0.01" value={editForm.valor} onChange={e => setE('valor', e.target.value)} />
            </FormGroup>
            <FormGroup label={editForm.contaId ? 'Saldo atual (automático)' : 'Já tenho (R$)'}>
              <input
                type="number" step="0.01"
                value={editForm.contaId ? String(atualEdit.toFixed(2)) : editForm.atual}
                onChange={e => setE('atual', e.target.value)}
                disabled={!!editForm.contaId}
                style={editForm.contaId ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
            </FormGroup>
          </FormRow>
          <FormRow>
            <FormGroup label="Poupar por mês (R$)">
              <input type="number" step="0.01" value={editForm.mensal} onChange={e => setE('mensal', e.target.value)} />
            </FormGroup>
            <FormGroup label="Conta vinculada (opcional)">
              <select value={editForm.contaId} onChange={e => setE('contaId', e.target.value)}>
                <option value="">— manual —</option>
                {contasInvest.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormGroup>
          </FormRow>

          {/* Preview rápido no modal — usa atualEdit (saldo ao vivo quando há conta vinculada) */}
          {(() => {
            const s = calcMeta(editForm.valor, atualEdit, editForm.mensal)
            if (s.v <= 0 || s.m <= 0) return null
            return (
              <div className={styles.modalPreview}>
                <ProgressBar pct={s.pct} />
                <div className={styles.modalPreviewSub}>
                  {s.pct}% · faltam {fmt(s.falta)} · {s.meses} {s.meses === 1 ? 'mês' : 'meses'}
                </div>
              </div>
            )
          })()}

          {errEdit && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{errEdit}</p>}
          <Button variant="primary" fullWidth onClick={salvarEdicao}>Salvar alterações</Button>
          <div style={{ height: 8 }} />
          <Button variant="ghost" fullWidth onClick={() => { setEditMeta(null); setErrEdit('') }}>Cancelar</Button>
        </Modal>
      )}
    </div>
  )
}
