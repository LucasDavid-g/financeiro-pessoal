import { useState, useEffect } from 'react'
import { Modal } from './Modal.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { CATEGORIES, CAT_CONFIG } from '../../data/defaults.js'
import { contaOptions } from '../../utils/contaFilters.js'
import { Button } from './Button.jsx'
import styles from '../sections/Lancamentos.module.css'

const TIPOS = [
  { id: 'despesa',      label: 'Despesa',      icon: 'ti-arrow-up-right',   color: '#F43F5E', bg: 'rgba(244,63,94,.08)'   },
  { id: 'receita',      label: 'Receita',      icon: 'ti-arrow-down-left',  color: '#10B981', bg: 'rgba(16,185,129,.08)'  },
  { id: 'investimento', label: 'Investimento', icon: 'ti-trending-up',      color: '#3B82F6', bg: 'rgba(59,130,246,.08)'  },
]

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// lancamento: objeto completo do lançamento a editar
// onClose: fecha o modal
export function EditarLancamentoModal({ lancamento, onClose }) {
  const { state, dispatch } = useApp()
  const [form, setForm] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (lancamento) {
      setForm({
        tipo: lancamento.tipo,
        desc: lancamento.desc,
        valor: String(lancamento.valor),
        data: lancamento.data,
        cat: lancamento.cat || 'outro',
        contaId: lancamento.contaId ? String(lancamento.contaId) : '',
      })
      setErrMsg('')
    } else {
      setForm(null)
    }
  }, [lancamento])

  if (!lancamento || !form) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const contexto  = form.tipo === 'investimento' ? 'investimento' : form.tipo === 'receita' ? 'receita' : 'despesa'
  const opcoes    = contaOptions(state.contas, contexto)
  const tipoAtivo = TIPOS.find(t => t.id === form.tipo)

  const handleSubmit = () => {
    if (!form.desc || !form.valor || !form.data) {
      setErrMsg('Preencha descrição, valor e data.')
      return
    }
    setErrMsg('')
    dispatch({
      type: 'EDIT_LANCAMENTO',
      payload: {
        ...form,
        id: lancamento.id,
        valor: parseFloat(form.valor),
        contaId: form.contaId ? parseInt(form.contaId) : null,
        // Status sempre derivado da data — regra universal do projeto.
        // Não é exposto como campo editável: muda automaticamente conforme a data.
        status: form.tipo === 'investimento' ? 'pago' : (form.data > localToday() ? 'pendente' : 'pago'),
        mes: form.data.slice(0, 7),
      },
    })
    onClose()
  }

  return (
    <Modal open={!!lancamento} onClose={onClose} title="Editar lançamento">
      <div className={styles.card} style={{ border: 'none', boxShadow: 'none', background: 'transparent', padding: 0 }}>

        {/* Seletor de tipo */}
        <div className={styles.tipoGrid}>
          {TIPOS.map(t => (
            <button
              key={t.id}
              className={[styles.tipoBtn, form.tipo === t.id ? styles.tipoBtnActive : ''].join(' ')}
              style={form.tipo === t.id ? { borderColor: t.color, background: t.bg } : {}}
              onClick={() => set('tipo', t.id)}
            >
              <div className={styles.tipoBtnIcon} style={form.tipo === t.id ? { color: t.color } : {}}>
                <i className={`ti ${t.icon}`} />
              </div>
              <span className={styles.tipoBtnLabel} style={form.tipo === t.id ? { color: t.color } : {}}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Valor */}
        <div className={styles.valorSection}>
          <label className={styles.valorLabel}>Valor</label>
          <div className={styles.valorInputWrap}>
            <span className={styles.valorPrefix} style={{ color: tipoAtivo?.color }}>R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={form.valor}
              onChange={e => set('valor', e.target.value)}
              className={styles.valorInput}
              style={{ '--border-color': tipoAtivo?.color }}
            />
          </div>
        </div>

        {/* Descrição */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Descrição</label>
          <input
            value={form.desc}
            onChange={e => set('desc', e.target.value)}
            className={styles.fieldInput}
          />
        </div>

        {/* Data */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Data</label>
          <input
            type="date"
            value={form.data}
            onChange={e => set('data', e.target.value)}
            className={styles.fieldInput}
          />
        </div>

        {/* Categoria — apenas despesas */}
        {form.tipo === 'despesa' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Categoria</label>
            <div className={styles.catGrid}>
              {CATEGORIES.map(c => {
                const cfg = CAT_CONFIG[c] || CAT_CONFIG.outro
                return (
                  <button
                    key={c}
                    className={[styles.catBtn, form.cat === c ? styles.catBtnActive : ''].join(' ')}
                    style={form.cat === c ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : {}}
                    onClick={() => set('cat', c)}
                    title={c}
                  >
                    <i className={`ti ${cfg.icon}`} />
                    <span>{c}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Conta */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            {contexto === 'investimento' ? 'Conta de investimento'
              : contexto === 'receita'  ? 'Conta que recebeu'
              : 'Conta / Cartão'}
          </label>
          <select value={form.contaId} onChange={e => set('contaId', e.target.value)} className={styles.fieldInput}>
            <option value="">Selecione a conta</option>
            {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {errMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--r50)', color: 'var(--r800)', fontSize: 13 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
            {errMsg}
          </div>
        )}

        <Button variant="primary" fullWidth onClick={handleSubmit}>Salvar alterações</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
      </div>
    </Modal>
  )
}
