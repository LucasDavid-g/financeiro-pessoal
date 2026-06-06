import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { ProgressBar } from '../ui/ProgressBar.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { fmt } from '../../utils/formatters.js'
import { MONTHS_FULL } from '../../data/defaults.js'
import styles from './Metas.module.css'

const EMPTY_FORM = { nome: '', valor: '', atual: '', mensal: '250' }

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

  // Simulador / form de criação
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Modal de edição
  const [editMeta, setEditMeta] = useState(null)   // meta sendo editada
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const setE = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  // Preview do simulador
  const sim = calcMeta(form.valor, form.atual, form.mensal)

  const salvar = () => {
    if (!form.nome || !form.valor) return alert('Preencha nome e valor.')
    dispatch({ type: 'ADD_META', payload: { nome: form.nome, valor: sim.v, atual: sim.a, mensal: sim.m } })
    setForm({ ...EMPTY_FORM })
  }

  const abrirEdicao = (m) => {
    setEditMeta(m)
    setEditForm({ nome: m.nome, valor: String(m.valor), atual: String(m.atual), mensal: String(m.mensal) })
  }

  const salvarEdicao = () => {
    if (!editForm.nome || !editForm.valor) return alert('Preencha nome e valor.')
    const { v, a, m } = calcMeta(editForm.valor, editForm.atual, editForm.mensal)
    dispatch({ type: 'EDIT_META', payload: { id: editMeta.id, nome: editForm.nome, valor: v, atual: a, mensal: m } })
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
          <FormGroup label="Já tenho (R$)">
            <input type="number" placeholder="0" value={form.atual} onChange={e => set('atual', e.target.value)} />
          </FormGroup>
        </FormRow>
        <FormGroup label="Poupar por mês (R$)">
          <input type="number" placeholder="250" value={form.mensal} onChange={e => set('mensal', e.target.value)} />
        </FormGroup>

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

        <Button variant="primary" fullWidth icon="ti-bookmark" onClick={salvar}>Salvar meta</Button>
      </div>

      {/* Lista de metas */}
      {state.metas.length > 0 ? (
        <div className={styles.metasList}>
          {state.metas.map(m => {
            const { falta, meses, pct } = calcMeta(m.valor, m.atual, m.mensal)
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
                  <span className={styles.metaAtual}>{fmt(m.atual)}</span>
                  <span className={styles.metaPct}>{pct}%</span>
                  <span className={styles.metaTotal}>{fmt(m.valor)}</span>
                </div>

                <ProgressBar pct={pct} />

                <div className={styles.metaFoot}>
                  <span className={styles.metaFalta}>Faltam {fmt(falta)}</span>
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
            <FormGroup label="Já tenho (R$)">
              <input type="number" step="0.01" value={editForm.atual} onChange={e => setE('atual', e.target.value)} />
            </FormGroup>
          </FormRow>
          <FormGroup label="Poupar por mês (R$)">
            <input type="number" step="0.01" value={editForm.mensal} onChange={e => setE('mensal', e.target.value)} />
          </FormGroup>

          {/* Preview rápido no modal */}
          {(() => {
            const s = calcMeta(editForm.valor, editForm.atual, editForm.mensal)
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

          <Button variant="primary" fullWidth onClick={salvarEdicao}>Salvar alterações</Button>
          <div style={{ height: 8 }} />
          <Button variant="ghost" fullWidth onClick={() => setEditMeta(null)}>Cancelar</Button>
        </Modal>
      )}
    </div>
  )
}
