import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { CATEGORIES, CAT_CONFIG } from '../../data/defaults.js'
import { contaOptions } from '../../utils/contaFilters.js'
import { TIPOS, localToday, contextoConta, deriveStatus } from '../../utils/lancamento.js'
import { Button } from '../ui/Button.jsx'
import styles from './Lancamentos.module.css'

export function Lancamentos() {
  const { state, dispatch } = useApp()

  const [form, setForm] = useState({
    tipo: 'despesa', desc: '', valor: '', data: localToday(),
    cat: 'alimentação', contaId: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [errMsg, setErrMsg] = useState('')
  const [okMsg,  setOkMsg]  = useState(false)

  const contexto    = contextoConta(form.tipo)
  const opcoes      = contaOptions(state.contas, contexto)
  const tipoAtivo   = TIPOS.find(t => t.id === form.tipo)
  const isPendente  = deriveStatus(form.tipo, form.data) === 'pendente'

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
      status: deriveStatus(form.tipo, form.data),
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
