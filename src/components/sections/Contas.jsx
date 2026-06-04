import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { ACCOUNT_COLORS, TIPO_LABEL } from '../../data/defaults.js'
import { getContaSaldo, getContaMesStats } from '../../utils/calculators.js'
import { fmt, getMonthKey } from '../../utils/formatters.js'

const EMPTY_CONTA = { nome: '', tipo: 'corrente', saldo: '', cor: ACCOUNT_COLORS[0] }
const EMPTY_TR    = { desc: '', origemId: '', destinoId: '', valor: '', data: new Date().toISOString().slice(0, 10) }

export function Contas({ selYear, selMonth }) {
  const { state, dispatch } = useApp()
  const [contaModal, setContaModal] = useState(false)
  const [trModal,    setTrModal]    = useState(false)
  const [contaForm,  setContaForm]  = useState({ ...EMPTY_CONTA, editId: null })
  const [trForm,     setTrForm]     = useState({ ...EMPTY_TR })
  const setC = (k, v) => setContaForm((f) => ({ ...f, [k]: v }))
  const setT = (k, v) => setTrForm((f) => ({ ...f, [k]: v }))

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

  const editConta = (c) => { setContaForm({ nome: c.nome, tipo: c.tipo, saldo: c.saldo, cor: c.cor, editId: c.id }); setContaModal(true) }

  const transfers = state.transferencias.filter((t) => t.mes === getMonthKey(selYear, selMonth))

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Minhas contas</div>
          <div style={{ fontSize: 12, color: 'var(--color-text3)', marginTop: 2 }}>
            patrimônio: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--color-text)' }}>{fmt(patrimonio)}</span>
          </div>
        </div>
        <Button variant="ghost" icon="ti-plus" onClick={() => { setContaForm({ ...EMPTY_CONTA, editId: null }); setContaModal(true) }}>Nova</Button>
      </div>

      {state.contas.length > 0 ? state.contas.map((c) => {
        const saldo = getContaSaldo(state, c.id)
        const stats = getContaMesStats(state, c.id, selYear, selMonth)
        return (
          <div key={c.id} style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem 1rem 1.5rem', marginBottom: '.75rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: c.cor, borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)' }} />
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 2 }}>
              <button onClick={() => editConta(c)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-pencil" /></button>
              <button onClick={() => { if (confirm('Remover esta conta?')) dispatch({ type: 'DEL_CONTA', id: c.id }) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-trash" /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: c.cor + '22', color: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                <i className={`ti ${c.tipo === 'cartao' ? 'ti-credit-card' : c.tipo === 'investimento' ? 'ti-trending-up' : 'ti-building-bank'}`} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{TIPO_LABEL[c.tipo] || c.tipo}</div>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--font-mono)', color: saldo >= 0 ? 'var(--g400)' : 'var(--r400)' }}>{fmt(saldo)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: '.75rem', paddingTop: '.75rem', borderTop: '0.5px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Entradas</div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--g400)', marginTop: 2 }}>{fmt(stats.entrada)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--color-text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>Saídas</div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--r400)', marginTop: 2 }}>{fmt(stats.saida)}</div>
              </div>
            </div>
          </div>
        )
      }) : <EmptyState message="Nenhuma conta cadastrada." />}

      <Card>
        <CardHeader title="Transferências" action={<Button variant="ghost" icon="ti-arrow-left-right" onClick={() => setTrModal(true)}>Nova</Button>} />
        {transfers.length > 0 ? transfers.slice().reverse().map((t) => {
          const orig = state.contas.find((c) => c.id === t.origemId)
          const dest = state.contas.find((c) => c.id === t.destinoId)
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--b50)', color: 'var(--b400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}><i className="ti ti-arrow-left-right" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.desc || 'Transferência'}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{orig?.nome || '?'} → {dest?.nome || '?'} · {t.data}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--b400)' }}>{fmt(t.valor)}</div>
              <button onClick={() => dispatch({ type: 'DEL_TRANSFER', id: t.id })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-trash" /></button>
            </div>
          )
        }) : <EmptyState message="Nenhuma transferência neste mês" />}
      </Card>

      <Modal open={contaModal} onClose={() => setContaModal(false)} title={contaForm.editId ? 'Editar conta' : 'Nova conta'}>
        <FormGroup label="Nome"><input value={contaForm.nome} onChange={(e) => setC('nome', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="Tipo">
            <select value={contaForm.tipo} onChange={(e) => setC('tipo', e.target.value)}>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Saldo inicial (R$)"><input type="number" step="0.01" value={contaForm.saldo} onChange={(e) => setC('saldo', e.target.value)} /></FormGroup>
        </FormRow>
        <FormGroup label="Cor">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {ACCOUNT_COLORS.map((cor) => (
              <div key={cor} onClick={() => setC('cor', cor)} style={{ width: 24, height: 24, borderRadius: '50%', background: cor, cursor: 'pointer', border: `2px solid ${contaForm.cor === cor ? 'var(--color-text)' : 'transparent'}`, transition: 'border-color .15s' }} />
            ))}
          </div>
        </FormGroup>
        <Button variant="primary" fullWidth onClick={saveConta}>Salvar</Button>
        <Button variant="ghost" fullWidth onClick={() => setContaModal(false)}>Cancelar</Button>
      </Modal>

      <Modal open={trModal} onClose={() => setTrModal(false)} title="Nova transferência">
        <FormGroup label="Descrição"><input value={trForm.desc} onChange={(e) => setT('desc', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="De"><select value={trForm.origemId} onChange={(e) => setT('origemId', e.target.value)}><option value="">—</option>{state.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></FormGroup>
          <FormGroup label="Para"><select value={trForm.destinoId} onChange={(e) => setT('destinoId', e.target.value)}><option value="">—</option>{state.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Valor (R$)"><input type="number" step="0.01" value={trForm.valor} onChange={(e) => setT('valor', e.target.value)} /></FormGroup>
          <FormGroup label="Data"><input type="date" value={trForm.data} onChange={(e) => setT('data', e.target.value)} /></FormGroup>
        </FormRow>
        <Button variant="primary" fullWidth onClick={saveTransfer}>Registrar</Button>
        <Button variant="ghost" fullWidth onClick={() => setTrModal(false)}>Cancelar</Button>
      </Modal>
    </div>
  )
}
