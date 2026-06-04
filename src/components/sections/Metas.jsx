import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { ProgressBar } from '../ui/ProgressBar.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { fmt } from '../../utils/formatters.js'
import { MONTHS_FULL } from '../../data/defaults.js'

export function Metas() {
  const { state, dispatch } = useApp()
  const [form, setForm] = useState({ nome: '', valor: '', atual: '', mensal: '250' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const valor  = parseFloat(form.valor)  || 0
  const atual  = parseFloat(form.atual)  || 0
  const mensal = parseFloat(form.mensal) || 0
  const falta  = Math.max(0, valor - atual)
  const meses  = mensal > 0 ? Math.ceil(falta / mensal) : 0
  const pct    = valor > 0 ? Math.min(100, Math.round(atual / valor * 100)) : 0
  const dataEst = (() => { const d = new Date(); d.setMonth(d.getMonth() + meses); return d })()

  const salvar = () => {
    if (!form.nome || !form.valor) return alert('Preencha nome e valor.')
    dispatch({ type: 'ADD_META', payload: { nome: form.nome, valor, atual, mensal } })
    setForm({ nome: '', valor: '', atual: '', mensal: '250' })
  }

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <Card>
        <CardHeader title="Simulador" />
        <div style={{ background: 'var(--color-surface2)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1rem' }}>
          <FormGroup label="Nome"><input placeholder="ex: Viagem, Notebook..." value={form.nome} onChange={(e) => set('nome', e.target.value)} /></FormGroup>
          <FormRow>
            <FormGroup label="Valor total (R$)"><input type="number" placeholder="0" value={form.valor} onChange={(e) => set('valor', e.target.value)} /></FormGroup>
            <FormGroup label="Já tenho (R$)"><input type="number" placeholder="0" value={form.atual} onChange={(e) => set('atual', e.target.value)} /></FormGroup>
          </FormRow>
          <FormGroup label="Poupar por mês (R$)"><input type="number" placeholder="250" value={form.mensal} onChange={(e) => set('mensal', e.target.value)} /></FormGroup>
          {valor > 0 && mensal > 0 && (
            <div style={{ borderTop: '0.5px solid var(--color-border)', marginTop: '1rem', paddingTop: '1rem' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Você consegue em</div>
              <div style={{ fontSize: 28, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--g400)', margin: '.5rem 0' }}>{meses} {meses === 1 ? 'mês' : 'meses'}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text3)' }}>Estimativa: {MONTHS_FULL[dataEst.getMonth()]} {dataEst.getFullYear()}</div>
              <ProgressBar pct={pct} />
              <div style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: 4 }}>{pct}% acumulado · faltam {fmt(falta)}</div>
            </div>
          )}
        </div>
        <Button variant="primary" fullWidth icon="ti-bookmark" onClick={salvar}>Salvar meta</Button>
      </Card>
      <Card>
        <CardHeader title="Minhas metas" />
        {state.metas.length > 0 ? state.metas.map((m) => {
          const flt = Math.max(0, m.valor - m.atual)
          const ms  = m.mensal > 0 ? Math.ceil(flt / m.mensal) : '?'
          const p   = Math.min(100, Math.round(m.atual / m.valor * 100))
          return (
            <div key={m.id} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--g50)', color: 'var(--g400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}><i className="ti ti-target" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{fmt(m.valor)} · {ms} meses</div>
                </div>
                <button onClick={() => dispatch({ type: 'DEL_META', id: m.id })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-trash" /></button>
              </div>
              <ProgressBar pct={p} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text3)' }}>{p}%</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text3)' }}>faltam {fmt(flt)}</span>
              </div>
            </div>
          )
        }) : <EmptyState message="Nenhuma meta. Use o simulador acima." />}
      </Card>
    </div>
  )
}
