import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Card, CardHeader } from '../ui/Card.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { ProgressBar } from '../ui/ProgressBar.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { CAT_CONFIG, CATEGORIES, RECEITA_CATEGORIES } from '../../data/defaults.js'
import { contaOptions, contaLabel } from '../../utils/contaFilters.js'
import { fmt } from '../../utils/formatters.js'
import { getFixosTotal, getParcelasTotal, getReceitasFixasTotal, parcelaAtualNoMes, parcelaEncerrada } from '../../utils/calculators.js'
import styles from './Fixos.module.css'

const EMPTY_FIXO    = { desc: '', valor: '', cat: 'moradia', contaId: '', dia: '' }
const EMPTY_PARCELA = { desc: '', valor: '', cartaoId: '', atual: '', total: '' }
const EMPTY_REC_FIXA = { desc: '', valor: '', dia: '', cat: 'salario', contaId: '' }

const recCatConfig = (id) => {
  const c = RECEITA_CATEGORIES.find(r => r.id === id) || RECEITA_CATEGORIES[RECEITA_CATEGORIES.length - 1]
  return { icon: c.icon, color: '#10B981', bg: 'rgba(16,185,129,.10)', label: c.label }
}

export function Fixos() {
  const { state, dispatch } = useApp()
  const [fixoModal,    setFixoModal]    = useState(false)
  const [parcelaModal, setParcelaModal] = useState(false)
  const [recFixaModal, setRecFixaModal] = useState(false)
  const [fixoForm,     setFixoForm]     = useState({ ...EMPTY_FIXO, editId: null })
  const [parcelaForm,  setParcelaForm]  = useState({ ...EMPTY_PARCELA, editId: null })
  const [recFixaForm,  setRecFixaForm]  = useState({ ...EMPTY_REC_FIXA, editId: null })
  const [fixoErr,      setFixoErr]      = useState('')
  const [parcelaErr,   setParcelaErr]   = useState('')
  const [recFixaErr,   setRecFixaErr]   = useState('')

  const setF  = (k, v) => setFixoForm(f  => ({ ...f, [k]: v }))
  const setP  = (k, v) => setParcelaForm(p => ({ ...p, [k]: v }))
  const setRF = (k, v) => setRecFixaForm(r => ({ ...r, [k]: v }))

  // Contas disponíveis para recorrentes (corrente, digital, poupança, cartão)
  const opcoesRecorrente = contaOptions(state.contas, 'recorrente')
  // Apenas cartões para parcelas
  const opcoesCartoes    = contaOptions(state.contas, 'cartoes')

  const saveFixo = () => {
    if (!fixoForm.desc || !(parseFloat(fixoForm.valor) > 0)) return setFixoErr('Preencha descrição e um valor maior que zero.')
    setFixoErr('')
    const payload = {
      desc: fixoForm.desc,
      valor: parseFloat(fixoForm.valor),
      cat: fixoForm.cat,
      contaId: fixoForm.contaId ? parseInt(fixoForm.contaId) : null,
      dia: fixoForm.dia ? parseInt(fixoForm.dia) : null,
    }
    if (fixoForm.editId) dispatch({ type: 'EDIT_FIXO', payload: { ...payload, id: fixoForm.editId } })
    else dispatch({ type: 'ADD_FIXO', payload })
    setFixoModal(false)
    setFixoForm({ ...EMPTY_FIXO, editId: null })
  }

  const saveParcela = () => {
    if (!parcelaForm.desc || !(parseFloat(parcelaForm.valor) > 0)) return setParcelaErr('Preencha descrição e um valor maior que zero.')
    // Busca nome do cartão selecionado
    const cartaoConta = state.contas.find(c => c.id === parseInt(parcelaForm.cartaoId))
    const payload = {
      desc:     parcelaForm.desc,
      valor:    parseFloat(parcelaForm.valor),
      cartao:   cartaoConta ? cartaoConta.nome : '—',
      cartaoId: parcelaForm.cartaoId ? parseInt(parcelaForm.cartaoId) : null,
      atual:    parseInt(parcelaForm.atual) || 1,
      total:    parcelaForm.total ? parseInt(parcelaForm.total) : 999,
    }
    setParcelaErr('')
    if (parcelaForm.editId) dispatch({ type: 'EDIT_PARCELA', payload: { ...payload, id: parcelaForm.editId } })
    else dispatch({ type: 'ADD_PARCELA', payload })
    setParcelaModal(false)
    setParcelaForm({ ...EMPTY_PARCELA, editId: null })
  }

  const saveRecFixa = () => {
    if (!recFixaForm.desc || !recFixaForm.dia || !(parseFloat(recFixaForm.valor) > 0)) return setRecFixaErr('Preencha descrição, dia e um valor maior que zero.')
    const dia = parseInt(recFixaForm.dia)
    if (dia < 1 || dia > 31) return setRecFixaErr('Dia deve ser entre 1 e 31.')
    setRecFixaErr('')
    const payload = {
      desc: recFixaForm.desc,
      valor: parseFloat(recFixaForm.valor),
      dia,
      cat: recFixaForm.cat,
      contaId: recFixaForm.contaId ? parseInt(recFixaForm.contaId) : null,
    }
    if (recFixaForm.editId) dispatch({ type: 'EDIT_RECEITA_FIXA', payload: { ...payload, id: recFixaForm.editId } })
    else dispatch({ type: 'ADD_RECEITA_FIXA', payload })
    setRecFixaModal(false)
    setRecFixaForm({ ...EMPTY_REC_FIXA, editId: null })
  }

  const editRecFixa = (r) => {
    setRecFixaForm({ desc: r.desc, valor: r.valor, dia: r.dia, cat: r.cat, contaId: r.contaId || '', editId: r.id })
    setRecFixaModal(true)
  }

  const editFixo = (f) => {
    setFixoForm({ desc: f.desc, valor: f.valor, cat: f.cat, contaId: f.contaId || '', dia: f.dia || '', editId: f.id })
    setFixoModal(true)
  }

  const editParcela = (p) => {
    setParcelaForm({ desc: p.desc, valor: p.valor, cartaoId: p.cartaoId || '', atual: p.atual, total: p.total === 999 ? '' : p.total, editId: p.id })
    setParcelaModal(true)
  }

  const iconBtn = (onClick, icon) => (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 6, color: 'var(--color-text3)', fontSize: 14, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <i className={`ti ${icon}`} />
    </button>
  )

  const totalFixos    = getFixosTotal(state.fixos)
  const totalParcelas = getParcelasTotal(state.parcelas)
  const totalRecFixas = getReceitasFixasTotal(state.receitasFixas)

  return (
    <div>
      {/* RECEITAS FIXAS */}
      <Card>
        <CardHeader
          title={`Receitas Fixas · ${fmt(totalRecFixas)}/mês`}
          action={<Button variant="ghost" icon="ti-plus" onClick={() => { setRecFixaForm({ ...EMPTY_REC_FIXA, editId: null }); setRecFixaModal(true) }}>Nova Receita Fixa</Button>}
        />
        {(state.receitasFixas || []).length > 0 ? state.receitasFixas.map(r => {
          const cfg   = recCatConfig(r.cat)
          const conta = state.contas.find(c => c.id === r.contaId)
          return (
            <div key={r.id} className={styles.fixoRow}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: r.ativo ? 1 : .4, flexShrink: 0 }}>
                <i className={`ti ${cfg.icon}`} />
              </div>
              <div className={styles.fixoContent}>
                <div className={styles.fixoDesc} style={{ opacity: r.ativo ? 1 : .5 }}>{r.desc}</div>
                <div className={styles.fixoSub}>
                  <span>todo dia {r.dia}</span>
                  {conta && <span>· {contaLabel(conta)}</span>}
                  <Badge variant={r.ativo ? 'g' : 'a'}>{r.ativo ? 'ativo' : 'pausado'}</Badge>
                </div>
              </div>
              <div className={styles.fixoRight}>
                <span className={styles.fixoVal} style={{ color: 'var(--g400)' }}>{fmt(r.valor)}</span>
                {iconBtn(() => editRecFixa(r), 'ti-pencil')}
                {iconBtn(() => dispatch({ type: 'TOGGLE_RECEITA_FIXA', id: r.id }), r.ativo ? 'ti-player-pause' : 'ti-player-play')}
                {iconBtn(() => dispatch({ type: 'DEL_RECEITA_FIXA', id: r.id }), 'ti-trash')}
              </div>
            </div>
          )
        }) : <EmptyState message="Nenhuma receita fixa cadastrada" />}
      </Card>

      {/* RECORRENTES */}
      <Card>
        <CardHeader
          title={`Recorrentes · ${fmt(totalFixos)}/mês`}
          action={<Button variant="ghost" icon="ti-plus" onClick={() => { setFixoForm({ ...EMPTY_FIXO, editId: null }); setFixoModal(true) }}>Novo</Button>}
        />
        {state.fixos.length > 0 ? state.fixos.map(f => {
          const cfg   = CAT_CONFIG[f.cat] || CAT_CONFIG.outro
          const conta = state.contas.find(c => c.id === f.contaId)
          return (
            <div key={f.id} className={styles.fixoRow}>
              {/* Ícone da categoria */}
              <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: f.ativo ? 1 : .4, flexShrink: 0 }}>
                <i className={`ti ${cfg.icon}`} />
              </div>

              {/* Linha 1: descrição + subtítulo */}
              <div className={styles.fixoContent}>
                <div className={styles.fixoDesc} style={{ opacity: f.ativo ? 1 : .5 }}>{f.desc}</div>
                <div className={styles.fixoSub}>
                  <span>{f.cat}</span>
                  {f.dia && <span>· vence dia {f.dia}</span>}
                  {conta && <span>· {contaLabel(conta)}</span>}
                  <Badge variant={f.ativo ? 'g' : 'a'}>{f.ativo ? 'ativo' : 'pausado'}</Badge>
                </div>
              </div>

              {/* Linha 2 (mobile) / direita (desktop): valor + ações */}
              <div className={styles.fixoRight}>
                <span className={styles.fixoVal}>{fmt(f.valor)}</span>
                {iconBtn(() => editFixo(f), 'ti-pencil')}
                {iconBtn(() => dispatch({ type: 'TOGGLE_FIXO', id: f.id }), f.ativo ? 'ti-player-pause' : 'ti-player-play')}
                {iconBtn(() => dispatch({ type: 'DEL_FIXO', id: f.id }), 'ti-trash')}
              </div>
            </div>
          )
        }) : <EmptyState message="Nenhum recorrente cadastrado" />}
      </Card>

      {/* PARCELAS */}
      <Card>
        <CardHeader
          title={`Parcelas · ${fmt(totalParcelas)}/mês`}
          action={<Button variant="ghost" icon="ti-plus" onClick={() => { setParcelaForm({ ...EMPTY_PARCELA, editId: null }); setParcelaModal(true) }}>Nova</Button>}
        />
        {opcoesCartoes.length === 0 && (
          <div style={{ fontSize: 12, padding: '10px 12px', marginBottom: 8, background: 'var(--a50)', borderRadius: 'var(--radius-md)', color: 'var(--a800)' }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Para cadastrar parcelas, primeiro adicione um cartão de crédito em <strong>Contas</strong>.
          </div>
        )}
        {state.parcelas.length > 0 ? state.parcelas.map(p => {
          const inf = p.total === 999
          // LN-2: parcela corrente derivada dos meses decorridos (limitada ao total)
          const atualVivo = inf ? p.atual : Math.min(parcelaAtualNoMes(p), p.total)
          const encerrada = parcelaEncerrada(p)
          const pct = inf ? 100 : Math.round(atualVivo / p.total * 100)
          const cartaoConta = state.contas.find(c => c.id === p.cartaoId)
          const cartaoLabel = cartaoConta ? contaLabel(cartaoConta) : p.cartao || '—'
          return (
            <div key={p.id} className={styles.parcelaWrap} style={{ opacity: encerrada ? 0.5 : 1 }}>
              <div className={styles.parcelaRow}>
                {/* Ícone */}
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--r50)', color: 'var(--r400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  <i className="ti ti-credit-card" />
                </div>

                {/* Linha 1: descrição + subtítulo */}
                <div className={styles.parcelaContent}>
                  <div className={styles.parcelaDesc}>
                    {p.desc}
                    {encerrada && <Badge variant="a" style={{ marginLeft: 6 }}>encerrada</Badge>}
                  </div>
                  <div className={styles.parcelaSub}>{cartaoLabel} · {inf ? 'recorrente' : `${atualVivo}/${p.total}`}</div>
                </div>

                {/* Linha 2 (mobile) / direita (desktop): valor + ações */}
                <div className={styles.parcelaRight}>
                  <span className={styles.parcelaVal} style={encerrada ? { textDecoration: 'line-through', color: 'var(--color-text3)' } : {}}>{fmt(p.valor)}</span>
                  {iconBtn(() => editParcela(p), 'ti-pencil')}
                  {iconBtn(() => dispatch({ type: 'DEL_PARCELA', id: p.id }), 'ti-trash')}
                </div>
              </div>
              {!inf && <ProgressBar pct={pct} color={encerrada ? 'var(--g400)' : 'var(--r400)'} />}
            </div>
          )
        }) : <EmptyState message="Nenhuma parcela cadastrada" />}
      </Card>

      {/* MODAL RECORRENTE */}
      <Modal open={fixoModal} onClose={() => setFixoModal(false)} title={fixoForm.editId ? 'Editar recorrente' : 'Novo recorrente'}>
        <FormGroup label="Descrição">
          <input value={fixoForm.desc} onChange={e => setF('desc', e.target.value)} placeholder="ex: Aluguel, Netflix..." />
        </FormGroup>
        <FormRow>
          <FormGroup label="Valor (R$)">
            <input type="number" step="0.01" value={fixoForm.valor} onChange={e => setF('valor', e.target.value)} />
          </FormGroup>
          <FormGroup label="Categoria">
            <select value={fixoForm.cat} onChange={e => setF('cat', e.target.value)}>
              {CATEGORIES.filter(c => c !== 'cartão').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormGroup label="Conta / Cartão que paga">
          <select value={fixoForm.contaId} onChange={e => setF('contaId', e.target.value)}>
            <option value="">— nenhuma —</option>
            {opcoesRecorrente.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Dia de vencimento (opcional)">
          <input type="number" min="1" max="31" placeholder="ex: 10" value={fixoForm.dia} onChange={e => setF('dia', e.target.value)} />
        </FormGroup>
        {fixoErr && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{fixoErr}</p>}
        <Button variant="primary" fullWidth onClick={saveFixo}>Salvar</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => { setFixoModal(false); setFixoErr('') }}>Cancelar</Button>
      </Modal>

      {/* MODAL PARCELA */}
      <Modal open={parcelaModal} onClose={() => setParcelaModal(false)} title={parcelaForm.editId ? 'Editar parcela' : 'Nova parcela'}>
        <FormGroup label="Descrição">
          <input value={parcelaForm.desc} onChange={e => setP('desc', e.target.value)} placeholder="ex: Cadeira, iPhone..." />
        </FormGroup>
        <FormRow>
          <FormGroup label="Valor (R$)">
            <input type="number" step="0.01" value={parcelaForm.valor} onChange={e => setP('valor', e.target.value)} />
          </FormGroup>
          <FormGroup label="Parcela atual">
            <input type="number" min="1" value={parcelaForm.atual} onChange={e => setP('atual', e.target.value)} />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Total de parcelas">
            <input type="number" min="1" placeholder="vazio = recorrente" value={parcelaForm.total} onChange={e => setP('total', e.target.value)} />
          </FormGroup>
          <FormGroup label="Cartão">
            <select value={parcelaForm.cartaoId} onChange={e => setP('cartaoId', e.target.value)}>
              <option value="">— selecione —</option>
              {opcoesCartoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {opcoesCartoes.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--a800)', marginTop: 4 }}>Cadastre um cartão em Contas primeiro.</div>
            )}
          </FormGroup>
        </FormRow>
        {parcelaErr && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{parcelaErr}</p>}
        <Button variant="primary" fullWidth onClick={saveParcela}>Salvar</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => { setParcelaModal(false); setParcelaErr('') }}>Cancelar</Button>
      </Modal>
      {/* MODAL RECEITA FIXA */}
      <Modal open={recFixaModal} onClose={() => setRecFixaModal(false)} title={recFixaForm.editId ? 'Editar receita fixa' : 'Nova receita fixa'}>
        <FormGroup label="Descrição">
          <input value={recFixaForm.desc} onChange={e => setRF('desc', e.target.value)} placeholder="ex: Salário, Aluguel recebido..." />
        </FormGroup>
        <FormRow>
          <FormGroup label="Valor (R$)">
            <input type="number" step="0.01" value={recFixaForm.valor} onChange={e => setRF('valor', e.target.value)} />
          </FormGroup>
          <FormGroup label="Dia do mês">
            <input type="number" min="1" max="31" value={recFixaForm.dia} onChange={e => setRF('dia', e.target.value)} />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Categoria">
            <select value={recFixaForm.cat} onChange={e => setRF('cat', e.target.value)}>
              {RECEITA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Conta que recebe">
            <select value={recFixaForm.contaId} onChange={e => setRF('contaId', e.target.value)}>
              <option value="">— nenhuma —</option>
              {opcoesRecorrente.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        {recFixaErr && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{recFixaErr}</p>}
        <Button variant="primary" fullWidth onClick={saveRecFixa}>Salvar</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => { setRecFixaModal(false); setRecFixaErr('') }}>Cancelar</Button>
      </Modal>
    </div>
  )
}
