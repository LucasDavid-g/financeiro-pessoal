import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { CATEGORIES } from '../../data/defaults.js'

export function Lancamentos() {
  const { state, dispatch } = useApp()
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({ tipo: 'despesa', desc: '', valor: '', data: today, cat: 'alimentação', contaId: '' })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.desc || !form.valor || !form.data) return alert('Preencha todos os campos.')
    dispatch({
      type: 'ADD_LANCAMENTO',
      payload: { ...form, valor: parseFloat(form.valor), contaId: form.contaId ? parseInt(form.contaId) : null },
    })
    setForm((f) => ({ ...f, desc: '', valor: '' }))
  }

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <Card>
        <CardHeader title="Novo lançamento" />
        <FormGroup label="Tipo">
          <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
            <option value="investimento">Investimento</option>
          </select>
        </FormGroup>
        <FormGroup label="Descrição">
          <input placeholder="ex: Mercado, Salário..." value={form.desc} onChange={(e) => set('desc', e.target.value)} />
        </FormGroup>
        <FormRow>
          <FormGroup label="Valor (R$)">
            <input type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={(e) => set('valor', e.target.value)} />
          </FormGroup>
          <FormGroup label="Data">
            <input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
          </FormGroup>
        </FormRow>
        {form.tipo === 'despesa' && (
          <FormGroup label="Categoria">
            <select value={form.cat} onChange={(e) => set('cat', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </FormGroup>
        )}
        <FormGroup label="Conta">
          <select value={form.contaId} onChange={(e) => set('contaId', e.target.value)}>
            <option value="">— selecione —</option>
            {state.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </FormGroup>
        <Button variant="primary" fullWidth icon="ti-plus" onClick={handleSubmit}>Adicionar</Button>
      </Card>
    </div>
  )
}
