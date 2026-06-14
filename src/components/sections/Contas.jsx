import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { Modal } from '../ui/Modal.jsx'
import { FormGroup, FormRow } from '../ui/FormGroup.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { BankLogo } from '../ui/BankLogo.jsx'
import { PeriodFilter } from '../ui/PeriodFilter.jsx'
import { ACCOUNT_COLORS, TIPO_LABEL } from '../../data/defaults.js'
import { contaOptions, contaLabel } from '../../utils/contaFilters.js'
import { getContaSaldo, getContaMesStats, getFaturaCartao, getCicloCartao, toLocalISO, getSaldoDisponivel, getInvestidoTotal } from '../../utils/calculators.js'
import { fmt } from '../../utils/formatters.js'
import { usePeriod } from '../../hooks/usePeriod.js'
import styles from './Contas.module.css'

const TIPO_ICONS = {
  corrente:     'ti-building-bank',
  digital:      'ti-device-mobile',
  cartao:       'ti-credit-card',
  investimento: 'ti-trending-up',
  poupanca:     'ti-piggy-bank',
}

const EMPTY_CONTA = { nome: '', tipo: 'corrente', saldo: '', cor: ACCOUNT_COLORS[0], limite: '', vencimento: '', fechamento: '', faturaAberta: '' }
const EMPTY_TR    = { desc: '', origemId: '', destinoId: '', valor: '', data: toLocalISO(new Date()) }

export function Contas() {
  const { state, dispatch } = useApp()
  const { period: trPeriod, setPreset: setTrPreset, setRange: setTrRange } = usePeriod()
  const [contaModal, setContaModal] = useState(false)
  const [trModal,    setTrModal]    = useState(false)
  const [contaForm,  setContaForm]  = useState({ ...EMPTY_CONTA, editId: null })
  const [trForm,     setTrForm]     = useState({ ...EMPTY_TR })
  const setC = (k, v) => setContaForm(f => ({ ...f, [k]: v }))
  const setT = (k, v) => setTrForm(f => ({ ...f, [k]: v }))

  // Mês atual para stats das contas
  // getMonthKey() já faz +1 internamente, então usamos getMonth() (0-indexed) direto
  const now = new Date()
  const selYear  = now.getFullYear()
  const selMonth = now.getMonth()

  const patrimonio = state.contas.reduce((s, c) => s + getContaSaldo(state, c.id), 0)
  const disponivel = getSaldoDisponivel(state)
  const investido  = getInvestidoTotal(state)
  const faturas    = state.contas
    .filter(c => c.tipo === 'cartao')
    .reduce((s, c) => s + Math.min(0, getContaSaldo(state, c.id)), 0)
    // faturas será negativo ou zero

  const isCartao = contaForm.tipo === 'cartao'

  // Calcula dias restantes até o dia N do mês (vencimento ou fechamento)
  // BUG-C03: clamp protege dias 29/30/31 em meses mais curtos
  const diasAte = (dia) => {
    if (!dia) return null
    const hoje = new Date()
    const hAno = hoje.getFullYear()
    const hMes = hoje.getMonth()
    const diaAtual = Math.min(dia, new Date(hAno, hMes + 1, 0).getDate())
    let d = new Date(hAno, hMes, diaAtual)
    if (d <= hoje) {
      const nMes = hMes + 1 > 11 ? 0 : hMes + 1
      const nAno = hMes + 1 > 11 ? hAno + 1 : hAno
      const diaProx = Math.min(dia, new Date(nAno, nMes + 1, 0).getDate())
      d = new Date(nAno, nMes, diaProx)
    }
    return Math.ceil((d - hoje) / 86400000)
  }

  // Ciclos dos cartões — memoizados para evitar recalcular getCicloCartao por cada render
  const ciclosPorConta = useMemo(() => {
    const map = {}
    state.contas.filter(c => c.tipo === 'cartao').forEach(c => {
      map[c.id] = getCicloCartao(state, c.id)
    })
    return map
  }, [state.contas, state.lancamentos, state.parcelas, state.fixos])

  const [contaErr, setContaErr] = useState('')
  const [trErr,    setTrErr]    = useState('')

  const saveConta = () => {
    if (!contaForm.nome) return setContaErr('Informe o nome da conta.')
    const payload = {
      nome:  contaForm.nome,
      tipo:  contaForm.tipo,
      cor:   contaForm.cor,
      // Para cartão: saldo = -(fatura atual), assim getContaSaldo retorna valor negativo (dívida)
      saldo: isCartao
        ? -(parseFloat(contaForm.saldo) || 0)
        : parseFloat(contaForm.saldo) || 0,
      // Campos exclusivos do cartão
      ...(isCartao && {
        limite:     parseFloat(contaForm.limite)     || 0,
        vencimento: parseInt(contaForm.vencimento)   || null,
        fechamento: parseInt(contaForm.fechamento)   || null,
      }),
    }
    setContaErr('')
    if (contaForm.editId) {
      dispatch({ type: 'EDIT_CONTA', payload: { ...payload, id: contaForm.editId } })
    } else {
      const novoContaId = state.nextId
      dispatch({ type: 'ADD_CONTA', payload })

      // Cria lançamento de fatura em aberto se informado (apenas em criação, não edição)
      const faturaAberta = parseFloat(contaForm.faturaAberta) || 0
      if (isCartao && faturaAberta > 0) {
        const vencimentoDia = parseInt(contaForm.vencimento) || 10
        const hoje = new Date()
        const mesVenc = hoje.getDate() >= vencimentoDia
          ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
          : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        const dataVenc = toLocalISO(new Date(mesVenc.getFullYear(), mesVenc.getMonth(), vencimentoDia))
        dispatch({
          type: 'ADD_LANCAMENTO',
          payload: {
            desc:     `Fatura em aberto · ${contaForm.nome}`,
            tipo:     'despesa',
            valor:    faturaAberta,
            data:     dataVenc,
            cat:      'cartão',
            contaId:  novoContaId,
            status:   'pendente',
          },
        })
      }
    }
    setContaModal(false)
    setContaForm({ ...EMPTY_CONTA, editId: null })
  }

  const saveTransfer = () => {
    const oId = parseInt(trForm.origemId), dId = parseInt(trForm.destinoId)
    if (!trForm.valor || !trForm.data) return setTrErr('Preencha valor e data.')
    if (oId === dId || (!oId && !dId)) return setTrErr('Selecione contas diferentes.')
    setTrErr('')
    dispatch({ type: 'ADD_TRANSFER', payload: { desc: trForm.desc, origemId: oId, destinoId: dId, valor: parseFloat(trForm.valor), data: trForm.data } })
    setTrModal(false)
    setTrForm({ ...EMPTY_TR })
  }

  const editConta = (c) => {
    setContaForm({
      nome:       c.nome,
      tipo:       c.tipo,
      cor:        c.cor,
      editId:     c.id,
      // Para cartão, mostramos a fatura (positivo) — o saldo é guardado negado
      saldo:      c.tipo === 'cartao' ? String(-c.saldo) : String(c.saldo),
      limite:     c.limite     != null ? String(c.limite)     : '',
      vencimento: c.vencimento != null ? String(c.vencimento) : '',
      fechamento: c.fechamento != null ? String(c.fechamento) : '',
    })
    setContaModal(true)
  }

  const deleteConta = (c) => {
    const temLancs = state.lancamentos.some(l => l.contaId === c.id)
    const temTrans = state.transferencias.some(t => t.origemId === c.id || t.destinoId === c.id)
    const temFixos = state.fixos.some(f => f.contaId === c.id)
    const linhas   = [`Excluir a conta "${c.nome}"?`]
    if (temLancs || temTrans || temFixos) {
      linhas.push('\nATENÇÃO: também serão removidos:')
      if (temLancs) linhas.push('• Todos os lançamentos vinculados')
      if (temTrans) linhas.push('• Transferências que envolvem esta conta')
      if (temFixos) linhas.push('• Vínculo de recorrentes')
    }
    if (window.confirm(linhas.join('\n'))) dispatch({ type: 'DEL_CONTA', id: c.id })
  }

  const transfers      = state.transferencias.filter(t => t.data >= trPeriod.inicio && t.data <= trPeriod.fim)
  const opcoesTransfer = contaOptions(state.contas, 'transferencia')

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Minhas contas</h2>
          <p className={styles.pageSub}>
            Patrimônio total: <span className={styles.patrimonioVal}>{fmt(patrimonio)}</span>
          </p>
          <div className={styles.patrimonioBreakdown}>
            <div className={styles.patrimonioRow}>
              <span className={styles.patrimonioRowLabel}>
                <i className="ti ti-trending-up" /> Investido
              </span>
              <span className={styles.patrimonioRowVal} style={{ color: 'var(--g400)' }}>
                {investido >= 0 ? '+' : '-'}{fmt(Math.abs(investido))}
              </span>
            </div>
            <div className={styles.patrimonioRow}>
              <span className={styles.patrimonioRowLabel}>
                <i className="ti ti-wallet" /> Disponível
              </span>
              <span className={styles.patrimonioRowVal} style={{ color: 'var(--g400)' }}>
                {disponivel >= 0 ? '+' : '-'}{fmt(Math.abs(disponivel))}
              </span>
            </div>
            {faturas < 0 && (
              <div className={styles.patrimonioRow}>
                <span className={styles.patrimonioRowLabel}>
                  <i className="ti ti-credit-card" /> Faturas abertas
                </span>
                <span className={styles.patrimonioRowVal} style={{ color: 'var(--r400)' }}>
                  -{fmt(Math.abs(faturas))}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className={styles.pageActions}>
          <Button variant="ghost" icon="ti-arrow-left-right" onClick={() => setTrModal(true)}>Transferir</Button>
          <Button variant="primary" icon="ti-plus" onClick={() => { setContaForm({ ...EMPTY_CONTA, editId: null }); setContaModal(true) }}>Nova conta</Button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className={styles.kpiStrip}>
        {[
          { label: 'Contas ativas', val: state.contas.length, icon: 'ti-building-bank', color: 'var(--b400)' },
          { label: 'Maior saldo',   val: fmt(Math.max(0, ...state.contas.map(c => getContaSaldo(state, c.id)))), icon: 'ti-arrow-up', color: 'var(--g400)' },
          { label: 'Investimentos', val: fmt(state.contas.filter(c => ['investimento','poupanca'].includes(c.tipo)).reduce((s,c) => s + getContaSaldo(state,c.id), 0)), icon: 'ti-trending-up', color: 'var(--p400)' },
        ].map(k => (
          <div key={k.label} className={styles.kpiItem}>
            <div className={styles.kpiIcon} style={{ color: k.color, background: k.color + '18' }}>
              <i className={`ti ${k.icon}`} />
            </div>
            <div>
              <div className={styles.kpiVal}>{k.val}</div>
              <div className={styles.kpiLabel}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid de contas */}
      {state.contas.length > 0 ? (
        <div className={styles.contasGrid}>
          {state.contas.map(c => {
            const saldo    = getContaSaldo(state, c.id)
            const stats    = getContaMesStats(state, c.id, selYear, selMonth)
            const icon     = TIPO_ICONS[c.tipo] || 'ti-building-bank'
            const isCard   = c.tipo === 'cartao'

            // Para cartão: ciclo real (se fechamento configurado) ou fatura total
            const ciclo      = isCard ? (ciclosPorConta[c.id] ?? null) : null
            const fatura     = isCard ? (ciclo ? ciclo.faturaAtual : getFaturaCartao(state, c.id)) : 0
            const limite     = isCard ? (c.limite || 0) : 0
            const disponivel = isCard ? Math.max(0, limite - fatura) : 0
            const utilizPct  = isCard && limite > 0 ? Math.min(100, Math.round((fatura / limite) * 100)) : 0

            // Para contas normais: participação no patrimônio (só positivo)
            const pct = !isCard && patrimonio > 0 ? Math.round((Math.max(0, saldo) / Math.max(1, patrimonio)) * 100) : 0

            return (
              <div key={c.id} className={styles.contaCard}>
                <div className={styles.contaAccent} style={{ background: c.cor }} />

                <div className={styles.contaTop}>
                  <BankLogo nome={c.nome} cor={c.cor} size={38} />
                  <div className={styles.contaActions}>
                    <button className={styles.actionBtn} onClick={() => editConta(c)} title="Editar">
                      <i className="ti ti-pencil" />
                    </button>
                    <button className={styles.actionBtn} onClick={() => deleteConta(c)} title="Excluir">
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>

                <div className={styles.contaName}>{c.nome}</div>
                <div className={styles.contaTipo}>{TIPO_LABEL[c.tipo] || c.tipo}</div>

                {isCard ? (
                  /* ── Layout cartão de crédito ── */
                  <>
                    <div className={styles.cartaoFatura}>
                      <span className={styles.cartaoFaturaLabel}>
                        {ciclo ? `Ciclo ${ciclo.inicioISO.slice(5)} › ${ciclo.fimISO.slice(5)}` : 'Fatura atual'}
                      </span>
                      <span className={styles.cartaoFaturaVal} style={{ color: fatura > 0 ? 'var(--r400)' : 'var(--color-text3)' }}>
                        {fmt(fatura)}
                      </span>
                    </div>

                    {/* Breakdown ciclo: compras manuais + mensais */}
                    {ciclo && ciclo.faturaAtual > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        {ciclo.faturaLancs > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--color-text3)', background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '1px 8px' }}>
                            Compras {fmt(ciclo.faturaLancs)}
                          </span>
                        )}
                        {ciclo.mensais > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--color-text3)', background: 'var(--color-surface2)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '1px 8px' }}>
                            Mensais {fmt(ciclo.mensais)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Barra de utilização */}
                    {limite > 0 && (
                      <div className={styles.participacao}>
                        <div className={styles.participacaoBar}>
                          <div
                            className={styles.participacaoFill}
                            style={{
                              width: `${utilizPct}%`,
                              background: utilizPct > 80 ? 'var(--r400)' : utilizPct > 50 ? 'var(--a400)' : c.cor,
                            }}
                          />
                        </div>
                        <span className={styles.participacaoPct}>{utilizPct}% do limite utilizado</span>
                      </div>
                    )}

                    {/* Info: disponível + limite */}
                    <div className={styles.contaStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Disponível</span>
                        <span className={styles.statVal} style={{ color: 'var(--g400)' }}>{fmt(disponivel)}</span>
                      </div>
                      <div className={styles.statDivider} />
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Limite</span>
                        <span className={styles.statVal}>{limite > 0 ? fmt(limite) : '—'}</span>
                      </div>
                    </div>

                    {/* Chips de vencimento / fechamento */}
                    {(c.vencimento || c.fechamento) && (
                      <div className={styles.cartaoChips}>
                        {c.vencimento && (() => {
                          const dias = diasAte(c.vencimento)
                          const urgente = dias !== null && dias <= 5
                          return (
                            <span className={styles.cartaoChip} style={urgente ? { borderColor: 'var(--r400)', color: 'var(--r400)' } : {}}>
                              <i className="ti ti-calendar-due" />
                              Vence dia {c.vencimento}
                              {dias !== null && <span style={{ opacity: 0.75 }}> · em {dias}d</span>}
                            </span>
                          )
                        })()}
                        {c.fechamento && (() => {
                          const dias = diasAte(c.fechamento)
                          return (
                            <span className={styles.cartaoChip}>
                              <i className="ti ti-calendar-x" />
                              Fecha dia {c.fechamento}
                              {dias !== null && <span style={{ opacity: 0.75 }}> · em {dias}d</span>}
                            </span>
                          )
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Layout conta normal ── */
                  <>
                    <div className={styles.contaSaldo} style={{ color: saldo >= 0 ? 'var(--g400)' : 'var(--r400)' }}>
                      {fmt(saldo)}
                    </div>

                    <div className={styles.participacao}>
                      <div className={styles.participacaoBar}>
                        <div className={styles.participacaoFill} style={{ width: `${Math.max(0, pct)}%`, background: c.cor }} />
                      </div>
                      <span className={styles.participacaoPct}>{pct}% do patrimônio</span>
                    </div>

                    <div className={styles.contaStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Entradas</span>
                        <span className={styles.statVal} style={{ color: 'var(--g400)' }}>{fmt(stats.entrada)}</span>
                      </div>
                      <div className={styles.statDivider} />
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Saídas</span>
                        <span className={styles.statVal} style={{ color: 'var(--r400)' }}>{fmt(stats.saida)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState message="Nenhuma conta cadastrada ainda." icon="ti-building-bank" />
      )}

      {/* Transferências */}
      <div className={styles.transSection}>
        <div className={styles.transSectionHeader}>
          <h3 className={styles.transSectionTitle}>Transferências</h3>
          <PeriodFilter period={trPeriod} onPreset={setTrPreset} onRange={setTrRange} align="right" />
        </div>
        {transfers.length > 0 ? (
          <div className={styles.transList}>
            {transfers.slice().reverse().map(t => {
              const orig = state.contas.find(c => c.id === t.origemId)
              const dest = state.contas.find(c => c.id === t.destinoId)
              return (
                <div key={t.id} className={styles.transItem}>
                  <div className={styles.transIcon}>
                    <i className="ti ti-arrow-left-right" />
                  </div>
                  <div className={styles.transInfo}>
                    <span className={styles.transDesc}>{t.desc || 'Transferência'}</span>
                    <span className={styles.transSub}>
                      {orig ? contaLabel(orig) : '?'} → {dest ? contaLabel(dest) : '?'} · {t.data}
                    </span>
                  </div>
                  <span className={styles.transVal}>{fmt(t.valor)}</span>
                  <button className={styles.actionBtn} onClick={() => dispatch({ type: 'DEL_TRANSFER', id: t.id })}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState message="Nenhuma transferência no período selecionado" icon="ti-arrow-left-right" compact />
        )}
      </div>

      {/* Modal Conta */}
      <Modal open={contaModal} onClose={() => setContaModal(false)} title={contaForm.editId ? 'Editar conta' : 'Nova conta'}>
        <FormGroup label="Nome"><input value={contaForm.nome} onChange={e => setC('nome', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="Tipo">
            <select value={contaForm.tipo} onChange={e => setC('tipo', e.target.value)}>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormGroup>
          <FormGroup label={isCartao ? 'Fatura atual (R$)' : 'Saldo inicial (R$)'}>
            <input
              type="number" step="0.01"
              placeholder="0"
              value={contaForm.saldo}
              onChange={e => setC('saldo', e.target.value)}
            />
          </FormGroup>
        </FormRow>

        {/* Campos exclusivos do cartão */}
        {isCartao && (
          <>
            <FormGroup label="Limite de crédito (R$)">
              <input
                type="number" step="0.01"
                placeholder="ex: 5000"
                value={contaForm.limite}
                onChange={e => setC('limite', e.target.value)}
              />
            </FormGroup>
            <FormRow>
              <FormGroup label="Dia de vencimento">
                <input
                  type="number" min="1" max="31"
                  placeholder="ex: 10"
                  value={contaForm.vencimento}
                  onChange={e => setC('vencimento', e.target.value)}
                />
              </FormGroup>
              <FormGroup label="Dia de fechamento">
                <input
                  type="number" min="1" max="31"
                  placeholder="ex: 3"
                  value={contaForm.fechamento}
                  onChange={e => setC('fechamento', e.target.value)}
                />
              </FormGroup>
            </FormRow>
            {!contaForm.editId && (
              <FormGroup label="Fatura em aberto (opcional)">
                <input
                  type="number" step="0.01" min="0"
                  placeholder="0,00"
                  value={contaForm.faturaAberta}
                  onChange={e => setC('faturaAberta', e.target.value)}
                />
                <p style={{ fontSize: 11, color: 'var(--color-text3)', margin: '4px 0 0' }}>
                  Se informado, será registrada como despesa pendente com vencimento no próximo dia de pagamento.
                </p>
              </FormGroup>
            )}
          </>
        )}

        <FormGroup label="Cor da conta">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {ACCOUNT_COLORS.map(cor => (
              <div key={cor} onClick={() => setC('cor', cor)} style={{
                width: 28, height: 28, borderRadius: '50%', background: cor,
                cursor: 'pointer', border: `3px solid ${contaForm.cor === cor ? 'var(--color-text)' : 'transparent'}`,
                transition: 'border-color .15s',
              }} />
            ))}
          </div>
        </FormGroup>
        {contaErr && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{contaErr}</p>}
        <Button variant="primary" fullWidth onClick={saveConta}>Salvar conta</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => { setContaModal(false); setContaErr('') }}>Cancelar</Button>
      </Modal>

      {/* Modal Transferência */}
      <Modal open={trModal} onClose={() => setTrModal(false)} title="Nova transferência">
        <FormGroup label="Descrição"><input value={trForm.desc} onChange={e => setT('desc', e.target.value)} /></FormGroup>
        <FormRow>
          <FormGroup label="De">
            <select value={trForm.origemId} onChange={e => setT('origemId', e.target.value)}>
              <option value="">Selecione</option>
              {opcoesTransfer.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Para">
            <select value={trForm.destinoId} onChange={e => setT('destinoId', e.target.value)}>
              <option value="">Selecione</option>
              {opcoesTransfer.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Valor (R$)"><input type="number" step="0.01" value={trForm.valor} onChange={e => setT('valor', e.target.value)} /></FormGroup>
          <FormGroup label="Data"><input type="date" value={trForm.data} onChange={e => setT('data', e.target.value)} /></FormGroup>
        </FormRow>
        {trErr && <p style={{ fontSize: 12, color: 'var(--r400)', margin: 0 }}>{trErr}</p>}
        <Button variant="primary" fullWidth onClick={saveTransfer}>Registrar transferência</Button>
        <div style={{ height: 8 }} />
        <Button variant="ghost" fullWidth onClick={() => { setTrModal(false); setTrErr('') }}>Cancelar</Button>
      </Modal>
    </div>
  )
}
