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

// Formata data local como YYYY-MM-DD sem conversão UTC (evita deslocamento UTC-3)
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function Lancamentos() {
  const { state, dispatch } = useApp()

  const [form, setForm] = useState({
    tipo: 'despesa', desc: '', valor: '', data: localToday(),
    cat: 'alimentação', contaId: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [errMsg, setErrMsg] = useState('')
  const [okMsg,  setOkMsg]  = useState(false)

  const contexto    = form.tipo === 'investimento' ? 'investimento' : form.tipo === 'receita' ? 'receita' : 'despesa'
  const opcoes      = contaOptions(state.contas, contexto)
  const tipoAtivo   = TIPOS.find(t => t.id === form.tipo)
  const isPendente  = form.data > localToday() && form.tipo !== 'investimento'

  const handleTipoChange = (novoTipo) => {
    setForm(f => ({ ...f, tipo: novoTipo, contaId: '' }))
  }

  const handleSubmit = () => {
    if (!form.desc || !form.data || !(parseFloat(form.valor) > 0)) {
      setErrMsg('Preencha descrição, data e um valor maior que zero.')
      return
    }
    setErrMsg('')
    const payload = {
      ...form,
      valor:   parseFloat(form.valor),
      contaId: form.contaId ? parseInt(form.contaId) : null,
      status: form.tipo === 'investimento' ? 'pago' : (form.data > localToday() ? 'pendente' : 'pago'),
    }
    dispatch({ type: 'ADD_LANCAMENTO', payload })
    setForm(f => ({ ...f, desc: '', valor: '', data: localToday() }))
    setOkMsg(true)
    setTimeout(() => setOkMsg(false), 2000)
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
        </div>

        {/* Pendente info */}
        {isPendente && (
          <div className={styles.pendInfo}>
            <i className="ti ti-info-circle" />
            <span>Data futura: este lançamento entra como pendente e só afeta o saldo quando a data chegar.</span>
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

        {/* Erro de validação */}
        {errMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--r50)', color: 'var(--r800)', fontSize: 13 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0 }} />
            {errMsg}
          </div>
        )}

        {/* Botão de envio */}
        <button
          className={styles.submitBtn}
          style={{
            background: okMsg
              ? 'linear-gradient(135deg,#10B981,#059669)'
              : tipoAtivo?.color
                ? `linear-gradient(135deg, ${tipoAtivo.color}, ${tipoAtivo.color}cc)`
                : 'var(--gradient-brand)',
          }}
          onClick={handleSubmit}
        >
          <i className={`ti ${okMsg ? 'ti-check' : 'ti-plus'}`} />
          {okMsg ? 'Adicionado!' : isPendente ? 'Registrar compromisso' : `Adicionar ${tipoAtivo?.label || ''}`}
        </button>
      </div>
    </div>
  )
}
