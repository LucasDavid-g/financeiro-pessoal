import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { ProgressBar } from '../ui/ProgressBar.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { CAT_CONFIG, CATEGORIES } from '../../data/defaults.js'
import { fmt } from '../../utils/formatters.js'

const EMPTY_FIXO    = { desc: '', valor: '', cat: 'moradia', contaId: '' }
const EMPTY_PARCELA = { desc: '', valor: '', cartao: 'Nubank', atual: '', total: '' }

export function Fixos() {
  const { state, dispatch } = useApp()
  const [fixoModal,    setFixoModal]    = useState(false)
  const [parcelaModal, setParcelaModal] = useState(false)
  const [fixoForm,     setFixoForm]     = useState({ ...EMPTY_FIXO, editId: null })
  const [parcelaForm,  setParcelaForm]  = useState({ ...EMPTY_PARCELA, editId: null })

  const setF = (k, v) => setFixoForm((f) => ({ ...f, [k]: v }))
  const setP = (k, v) => setParcelaForm((p) => ({ ...p, [k]: v }))

  const saveFixo = () => {
    if (!fixoForm.desc || !fixoForm.valor) return alert('Preencha os campos.')
    const payload = { desc: fixoForm.desc, valor: parseFloat(fixoForm.valor), cat: fixoForm.cat, contaId: fixoForm.contaId ? parseInt(fixoForm.contaId) : null }
    if (fixoForm.editId) dispatch({ type: 'EDIT_FIXO', payload: { ...payload, id: fixoForm.editId } })
    else dispatch({ type: 'ADD_FIXO', payload })
    setFixoModal(false)
    setFixoForm({ ...EMPTY_FIXO, editId: null })
  }

  const saveParcela = () => {
    if (!parcelaForm.desc || !parcelaForm.valor) return alert('Preencha os campos.')
    const payload = { desc: parcelaForm.desc, valor: parseFloat(parcelaForm.valor), cartao: parcelaForm.cartao, atual: parseInt(parcelaForm.atual) || 1, total: parcelaForm.total ? parseInt(parcelaForm.total) : 999 }
    if (parcelaForm.editId) dispatch({ type: 'EDIT_PARCELA', payload: { ...payload, id: parcelaForm.editId } })
    else dispatch({ type: 'ADD_PARCELA', payload })
    setParcelaModal(false)
    setParcelaForm({ ...EMPTY_PARCELA, editId: null })
  }

  const editFixo = (f) => { setFixoForm({ desc: f.desc, valor: f.valor, cat: f.cat, contaId: f.contaId || '', editId: f.id }); setFixoModal(true) }
  const editParcela = (p) => { setParcelaForm({ desc: p.desc, valor: p.valor, cartao: p.cartao, atual: p.atual, total: p.total === 999 ? '' : p.total, editId: p.id }); setParcelaModal(true) }

  return (
    <div style={{ padding: '0 1.25rem' }}>
      <Card>
        <CardHeader title="Recorrentes" action={<Button variant="ghost" icon="ti-plus" onClick={() => { setFixoForm({ ...EMPTY_FIXO, editId: null }); setFixoModal(true) }}>Novo</Button>} />
        {state.fixos.length > 0 ? state.fixos.map((f) => {
          const cfg   = CAT_CONFIG[f.cat] || CAT_CONFIG.outro
          const conta = state.contas.find((c) => c.id === f.contaId)
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: f.ativo ? 1 : .4 }}>
                <i className={`ti ${cfg.icon}`} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, opacity: f.ativo ? 1 : .5 }}>{f.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: 1 }}>
                  {f.cat}{conta ? ' · ' + conta.nome : ''} · <Badge variant={f.ativo ? 'g' : 'a'}>{f.ativo ? 'ativo' : 'pausado'}</Badge>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--r400)', flexShrink: 0 }}>{fmt(f.valor)}</div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => editFixo(f)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-pencil" /></button>
                <button onClick={() => dispatch({ type: 'TOGGLE_FIXO', id: f.id })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className={`ti ti-${f.ativo ? 'player-pause' : 'player-play'}`} /></button>
                <button onClick={() => dispatch({ type: 'DEL_FIXO', id: f.id })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-trash" /></button>
              </div>
            </div>
          )
        }) : <EmptyState message="Nenhum recorrente" />}
      </Card>

      <Card>
        <CardHeader title="Parcelas" action={<Button variant="ghost" icon="ti-plus" onClick={() => { setParcelaForm({ ...EMPTY_PARCELA, editId: null }); setParcelaModal(true) }}>Nova</Button>} />
        {state.parcelas.length > 0 ? state.parcelas.map((p) => {
          const inf = p.total === 999
          const pct = inf ? 100 : Math.round(p.atual / p.total * 100)
          return (
            <div key={p.id} style={{ padding: '9px 0', borderBottom: '0.5px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FCEBEB', color: '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}><i className="ti ti-credit-card" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{p.cartao} · {inf ? 'recorrente' : `${p.atual}/${p.total}`}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--r400)' }}>{fmt(p.valor)}</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => editParcela(p)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-pencil" /></button>
                  <button onClick={() => dispatch({ type: 'DEL_PARCELA', id: p.id })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14 }}><i className="ti ti-trash" /></button>
                </div>
              </div>
              {!inf && <ProgressBar pct={pct} color="var(--r400)" />}
            </div>
          )
        }) : <EmptyState message="Nenhuma parcela" />}
      </Card>

      <Modal open={fixoModal} onClose={() => setFixoModal(false)} title={fixoForm.editId ? 'Editar recorrente' : 'Novo recorrente'}>
        <FormGroup label="Descrição"><input value={fixoForm.desc} onChange={(e) => setF('desc', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="Valor (R$)"><input type="number" step="0.01" value={fixoForm.valor} onChange={(e) => setF('valor', e.target.value)} /></FormGroup>
          <FormGroup label="Categoria"><select value={fixoForm.cat} onChange={(e) => setF('cat', e.target.value)}>{CATEGORIES.filter(c => c !== 'cartão').map((c) => <option key={c} value={c}>{c}</option>)}</select></FormGroup>
        </FormRow>
        <FormGroup label="Conta que paga"><select value={fixoForm.contaId} onChange={(e) => setF('contaId', e.target.value)}><option value="">— nenhuma —</option>{state.contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></FormGroup>
        <Button variant="primary" fullWidth onClick={saveFixo}>Salvar</Button>
        <Button variant="ghost" fullWidth onClick={() => setFixoModal(false)}>Cancelar</Button>
      </Modal>

      <Modal open={parcelaModal} onClose={() => setParcelaModal(false)} title={parcelaForm.editId ? 'Editar parcela' : 'Nova parcela'}>
        <FormGroup label="Descrição"><input value={parcelaForm.desc} onChange={(e) => setP('desc', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="Valor (R$)"><input type="number" step="0.01" value={parcelaForm.valor} onChange={(e) => setP('valor', e.target.value)} /></FormGroup>
          <FormGroup label="Cartão"><select value={parcelaForm.cartao} onChange={(e) => setP('cartao', e.target.value)}><option>Nubank</option><option>Inter</option><option>Itaú</option><option>Outro</option></select></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Parcela atual"><input type="number" min="1" value={parcelaForm.atual} onChange={(e) => setP('atual', e.target.value)} /></FormGroup>
          <FormGroup label="Total"><input type="number" min="1" placeholder="vazio = recorrente" value={parcelaForm.total} onChange={(e) => setP('total', e.target.value)} /></FormGroup>
        </FormRow>
        <Button variant="primary" fullWidth onClick={saveParcela}>Salvar</Button>
        <Button variant="ghost" fullWidth onClick={() => setParcelaModal(false)}>Cancelar</Button>
      </Modal>
    </div>
  )
}
