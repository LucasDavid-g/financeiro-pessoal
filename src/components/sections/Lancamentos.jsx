import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { CATEGORIES, CAT_CONFIG } from '../../data/defaults.js'
import { contaOptions } from '../../utils/contaFilters.js'
import { Button } from '../ui/Button.jsx'
import styles from './Lancamentos.module.css'

const TIPOS = [
  { id: 'despesa',      label: 'Despesa',      icon: 'ti-arrow-up-right',   color: '#F43F5E', bg: 'rgba(244,63,94,.08)'   },
  { id: 'receita',      label: 'Receita',      icon: 'ti-arrow-down-left',  color: '#10B981', bg: 'rgba(16,185,129,.08)'  },
  { id: 'investimento', label: 'Investimento', icon: 'ti-trending-up',      color: '#3B82F6', bg: 'rgba(59,130,246,.08)'  },
]

const STATUS_OPTS = [
  { value: 'pago',     label: 'Pago',     icon: 'ti-check',     color: '#10B981', bg: 'rgba(16,185,129,.10)' },
  { value: 'pendente', label: 'Pendente', icon: 'ti-clock',     color: '#F59E0B', bg: 'rgba(245,158,11,.10)' },
]

export function Lancamentos() {
  const { state, dispatch } = useApp()
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    tipo: 'despesa', desc: '', valor: '', data: today,
    cat: 'alimentação', contaId: '', status: 'pago',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const contexto    = form.tipo === 'investimento' ? 'investimento' : form.tipo === 'receita' ? 'receita' : 'despesa'
  const opcoes      = contaOptions(state.contas, contexto)
  const tipoAtivo   = TIPOS.find(t => t.id === form.tipo)
  const isPendente  = form.tipo === 'despesa' && form.status === 'pendente'

  const handleTipoChange = (novoTipo) => {
    setForm(f => ({ ...f, tipo: novoTipo, contaId: '', status: novoTipo === 'despesa' ? f.status : 'pago' }))
  }

  const handleSubmit = () => {
    if (!form.desc || !form.valor || !form.data) return alert('Preencha todos os campos.')
    const payload = {
      ...form,
      valor:   parseFloat(form.valor),
      contaId: form.contaId ? parseInt(form.contaId) : null,
      status:  form.tipo === 'despesa' ? form.status : 'pago',
    }
    dispatch({ type: 'ADD_LANCAMENTO', payload })
    setForm(f => ({ ...f, desc: '', valor: '' }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Novo lançamento</h2>
        <p className={styles.sub}>Registre uma receita, despesa ou investimento</p>
      </div>

      <div className={styles.card}>

        {/* Seletor de tipo */}
        <div className={styles.tipoGrid}>
          {TIPOS.map(t => (
            <button
              key={t.id}
              className={[styles.tipoBtn, form.tipo === t.id ? styles.tipoBtnActive : ''].join(' ')}
              style={form.tipo === t.id ? { borderColor: t.color, background: t.bg } : {}}
              onClick={() => handleTipoChange(t.id)}
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

        {/* Campo valor — destaque */}
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
            placeholder="ex: Mercado, Salário, Aporte..."
            value={form.desc}
            onChange={e => set('desc', e.target.value)}
            className={styles.fieldInput}
          />
        </div>

        {/* Data + Status */}
        <div className={styles.row2}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Data</label>
            <input
              type="date"
              value={form.data}
              onChange={e => set('data', e.target.value)}
              className={styles.fieldInput}
            />
          </div>

          {form.tipo === 'despesa' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Status</label>
              <div className={styles.statusRow}>
                {STATUS_OPTS.map(s => (
                  <button
                    key={s.value}
                    className={[styles.statusBtn, form.status === s.value ? styles.statusBtnActive : ''].join(' ')}
                    style={form.status === s.value ? { background: s.bg, borderColor: s.color, color: s.color } : {}}
                    onClick={() => set('status', s.value)}
                  >
                    <i className={`ti ${s.icon}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pendente info */}
        {isPendente && (
          <div className={styles.pendInfo}>
            <i className="ti ti-info-circle" />
            <span>Despesa pendente reserva o valor no saldo disponível sem descontar do saldo atual.</span>
          </div>
        )}

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
        {!isPendente && (
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
        )}

        {/* Botão */}
        <button
          className={styles.submitBtn}
          style={{ background: tipoAtivo?.color ? `linear-gradient(135deg, ${tipoAtivo.color}, ${tipoAtivo.color}cc)` : 'var(--gradient-brand)' }}
          onClick={handleSubmit}
        >
          <i className="ti ti-plus" />
          {isPendente ? 'Registrar compromisso' : `Adicionar ${tipoAtivo?.label || ''}`}
        </button>
      </div>
    </div>
  )
}
