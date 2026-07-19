import { useState, useMemo, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  detectEncoding, detectBanco, parseCSV,
  detectarDuplicata, categorizarAuto, validarArquivo,
} from '../../utils/csvImport.js'
import { CATEGORIES, CAT_CONFIG } from '../../data/defaults.js'
import { fmt } from '../../utils/formatters.js'
import { Button } from '../ui/Button.jsx'
import { Badge } from '../ui/Badge.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { useIsMobile } from '../../hooks/useIsMobile.js'

const INSTRUCOES = {
  nubank:   'Nubank: app → Cartão → Gerenciar → Extrato → Exportar CSV',
  itau:     'Itaú: Internet Banking → Extrato → Exportar → CSV',
  inter:    'Inter: app → Extrato → Compartilhar → CSV',
  bradesco: 'Bradesco: Internet Banking → Extrato → Salvar como CSV',
  c6:       'C6 Bank: app → Fatura → Exportar → CSV',
  generic:  'Formato não reconhecido automaticamente — tentaremos ler mesmo assim.',
}
const BANCO_LABEL = { nubank: 'Nubank', itau: 'Itaú', inter: 'Inter', bradesco: 'Bradesco', c6: 'C6 Bank', generic: 'Genérico' }

// Badge de duplicata por tipo
const DUP = {
  exata:    { variant: 'a', label: 'duplicata',           cor: 'var(--color-text3)' },
  provavel: { variant: 'a', label: 'possível duplicata',  cor: 'var(--a400)' },
  possivel: { variant: 'a', label: 'possível',            cor: 'var(--a400)' },
  nova:     { variant: 'g', label: 'nova',                cor: 'var(--g400)' },
}

const lerArquivo = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(detectEncoding(reader.result))
  reader.onerror = () => reject(new Error('falha ao ler o arquivo'))
  reader.readAsArrayBuffer(file)
})

export function Importar({ onNavigate = () => {}, undo, setUndo }) {
  const { state, dispatch } = useApp()
  const isMobile = useIsMobile(768)

  const [etapa, setEtapa]           = useState('upload')   // upload | revisao | confirmacao
  const [arquivo, setArquivo]       = useState(null)
  const [conteudo, setConteudo]     = useState('')
  const [banco, setBanco]           = useState(null)
  const [erroUpload, setErroUpload] = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const [processando, setProcessando] = useState(false)

  const [resultado, setResultado]   = useState(null)       // saída do parseCSV
  const [itens, setItens]           = useState([])         // itens de revisão
  const [filtro, setFiltro]         = useState('todas')    // todas | novas
  const [errosExpand, setErrosExpand] = useState(false)

  const [importResult, setImportResult] = useState(null)   // { importados }
  const inputRef = useRef(null)

  // ── ETAPA 1: seleção de arquivo ─────────────────────────────────────
  const selecionarArquivo = async (file) => {
    setErroUpload('')
    const v = validarArquivo(file)
    if (!v.valido) { setErroUpload(v.erro); setArquivo(null); setBanco(null); return }
    setArquivo(file)
    try {
      const texto = await lerArquivo(file)
      setConteudo(texto)
      const primeiraLinha = texto.split(/\r\n|\n|\r/)[0] || ''
      setBanco(detectBanco(primeiraLinha))
    } catch {
      setErroUpload('Não foi possível ler o arquivo. Tente exportar novamente.')
      setArquivo(null); setBanco(null)
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) selecionarArquivo(file)
  }

  // ── ETAPA 1 → 2: processar ──────────────────────────────────────────
  const processar = () => {
    setProcessando(true)
    // setTimeout(0) para o spinner pintar antes do parse síncrono
    setTimeout(() => {
      const r = parseCSV(conteudo)
      setResultado(r)
      if (r.transacoes.length === 0) { setProcessando(false); return } // erro tratado no render
      const novos = r.transacoes.map((t, idx) => {
        const dup = detectarDuplicata(t, state.lancamentos)
        const cat = categorizarAuto(t.desc)
        return {
          idx, data: t.data, desc: t.desc, valor: t.valor, tipo: t.tipo,
          cat: cat.cat, confianca: cat.confianca, dup,
          incluir: dup.tipo !== 'exata',   // duplicata exata desmarcada por padrão
        }
      })
      setItens(novos)
      setEtapa('revisao')
      setProcessando(false)
    }, 0)
  }

  const resetar = () => {
    setEtapa('upload'); setArquivo(null); setConteudo(''); setBanco(null)
    setResultado(null); setItens([]); setErroUpload(''); setFiltro('todas'); setImportResult(null)
  }

  // ── ETAPA 2: revisão ────────────────────────────────────────────────
  const setItem = (idx, patch) => setItens(prev => prev.map(it => it.idx === idx ? { ...it, ...patch } : it))
  const visiveis = useMemo(
    () => filtro === 'novas' ? itens.filter(i => i.dup.tipo === 'nova') : itens,
    [itens, filtro]
  )
  const selecionados = useMemo(() => itens.filter(i => i.incluir), [itens])
  const nDuplicatas  = useMemo(() => itens.filter(i => i.dup.tipo !== 'nova').length, [itens])

  const importar = () => {
    const payload = selecionados.map(i => ({ data: i.data, desc: i.desc, valor: i.valor, cat: i.cat, tipo: i.tipo }))
    if (payload.length === 0) return
    const primeiroId = state.nextId                 // ids serão [nextId, nextId+1, ...]
    dispatch({ type: 'IMPORT_LANCAMENTOS', payload })
    const ids = payload.map((_, k) => primeiroId + k)
    setUndo({ ids, expiraEm: Date.now() + 5 * 60 * 1000 })
    setImportResult({ importados: payload.length })
    setEtapa('confirmacao')
  }

  // ── ETAPA 3: desfazer ───────────────────────────────────────────────
  const podeDesfazer = undo && undo.ids?.length > 0 && Date.now() < undo.expiraEm
  const desfazer = () => {
    undo.ids.forEach(id => dispatch({ type: 'DEL_LANCAMENTO', id }))
    setUndo(null)
    resetar()
  }

  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header + passos */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Importar extrato</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text3)', margin: '4px 0 0' }}>
          Suba o CSV da fatura ou extrato e importe em lote, com revisão e detecção de duplicatas.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {['Upload', 'Revisão', 'Confirmação'].map((p, i) => {
            const atual = ['upload', 'revisao', 'confirmacao'][i] === etapa
            const feito = ['upload', 'revisao', 'confirmacao'].indexOf(etapa) > i
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  background: atual ? 'var(--gradient-brand)' : feito ? 'var(--g400)' : 'var(--color-surface2)',
                  color: (atual || feito) ? '#fff' : 'var(--color-text3)',
                }}>{feito ? <i className="ti ti-check" /> : i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: atual ? 700 : 500, color: atual ? 'var(--color-text)' : 'var(--color-text3)' }}>{p}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ ETAPA 1: UPLOAD ══ */}
      {etapa === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--g400)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)', padding: '32px 20px', textAlign: 'center',
              cursor: 'pointer', background: dragOver ? 'rgba(16,185,129,.05)' : 'var(--color-surface)',
              transition: 'var(--transition)',
            }}
          >
            <i className="ti ti-file-import" style={{ fontSize: 40, color: 'var(--g400)' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 10 }}>
              {arquivo ? arquivo.name : isMobile ? 'Toque para selecionar o arquivo' : 'Arraste o arquivo ou clique para selecionar'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text3)', marginTop: 4 }}>Formatos: .csv, .txt, .ofx · máximo 5 MB</div>
            <input
              ref={inputRef} type="file" accept=".csv,.txt,.ofx" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) selecionarArquivo(f); e.target.value = '' }}
            />
          </div>

          {erroUpload && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--r50)', color: 'var(--r800)', fontSize: 13 }}>
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />{erroUpload}
            </div>
          )}

          {arquivo && banco && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600 }}>
                Banco detectado: <span style={{ color: 'var(--g400)' }}>{BANCO_LABEL[banco]}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text3)', marginTop: 4 }}>{INSTRUCOES[banco]}</div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--color-text3)', padding: '0 2px' }}>
            <i className="ti ti-shield-lock" style={{ color: 'var(--g400)', flexShrink: 0, marginTop: 1 }} />
            <span>O arquivo é processado <strong>localmente no seu dispositivo</strong>. Nenhum dado é enviado para servidores externos durante a leitura.</span>
          </div>

          <Button variant="primary" fullWidth disabled={!arquivo || processando} onClick={processar}>
            {processando ? 'Processando…' : 'Processar arquivo'}
          </Button>

          {/* Erro: nenhuma transação encontrada (após processar) */}
          {resultado && resultado.transacoes.length === 0 && (
            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--r50)', color: 'var(--r800)', fontSize: 13 }}>
              <strong>Não conseguimos ler transações neste arquivo.</strong><br />
              Tente exportar novamente ou confirme que é um CSV de extrato/fatura.
              {resultado.erros.length > 0 && ` (${resultado.erros.length} linha(s) com erro)`}
            </div>
          )}
        </div>
      )}

      {/* ══ ETAPA 2: REVISÃO ══ */}
      {etapa === 'revisao' && resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Resumo */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { l: 'Encontradas', v: itens.length, c: 'var(--color-text)' },
              { l: 'Duplicatas', v: nDuplicatas, c: 'var(--a400)' },
              { l: 'Selecionadas', v: selecionados.length, c: 'var(--g400)' },
            ].map(k => (
              <div key={k.l} style={{ flex: 1, minWidth: 100, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: k.c, fontFamily: 'var(--font-mono)' }}>{k.v}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text3)' }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Linhas com erro (expansível) */}
          {resultado.erros.length > 0 && (
            <div style={{ borderRadius: 'var(--radius-md)', background: 'var(--a50)', border: '1px solid var(--a400)', overflow: 'hidden' }}>
              <button onClick={() => setErrosExpand(x => !x)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--a800)', fontSize: 13 }}>
                <span><i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />{resultado.erros.length} linha(s) não puderam ser lidas</span>
                <i className={`ti ${errosExpand ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
              </button>
              {errosExpand && (
                <div style={{ padding: '0 12px 10px', maxHeight: 160, overflowY: 'auto' }}>
                  {resultado.erros.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text3)', padding: '3px 0', borderTop: '1px solid var(--color-border)' }}>
                      linha {e.indice + 1} · {e.motivo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[['todas', 'Mostrar todas'], ['novas', 'Só novas']].map(([id, lbl]) => (
              <button key={id} onClick={() => setFiltro(id)} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${filtro === id ? 'var(--g400)' : 'var(--color-border)'}`,
                background: filtro === id ? 'rgba(16,185,129,.08)' : 'transparent',
                color: filtro === id ? 'var(--g400)' : 'var(--color-text3)', fontWeight: 600,
              }}>{lbl}</button>
            ))}
          </div>

          {/* Lista */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
            {visiveis.map(it => {
              const dcfg = DUP[it.dup.tipo]
              return (
                <div key={it.idx} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)', opacity: it.incluir ? 1 : 0.55,
                }}>
                  <input type="checkbox" checked={it.incluir} onChange={e => setItem(it.idx, { incluir: e.target.checked })} style={{ accentColor: 'var(--g400)', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.desc || '(sem descrição)'}</span>
                      <span style={{ fontSize: 10, color: dcfg.cor, flexShrink: 0 }}>● {dcfg.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: 2 }}>
                      {it.data}
                      {it.confianca === 'baixa' && <span style={{ color: 'var(--a400)', marginLeft: 6 }}><i className="ti ti-flag" style={{ fontSize: 10 }} /> revisar</span>}
                    </div>
                  </div>
                  <select value={it.cat} onChange={e => setItem(it.idx, { cat: e.target.value })} style={{
                    fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--color-border)',
                    background: 'var(--color-surface2)', color: 'var(--color-text)', maxWidth: 110, flexShrink: 0,
                  }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0, color: it.tipo === 'receita' ? 'var(--g400)' : 'var(--r400)' }}>
                    {it.tipo === 'receita' ? '+' : '-'}{fmt(it.valor)}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" onClick={resetar}>Cancelar</Button>
            <div style={{ flex: 1 }}>
              <Button variant="primary" fullWidth disabled={selecionados.length === 0} onClick={importar}>
                Importar {selecionados.length} lançamento{selecionados.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ETAPA 3: CONFIRMAÇÃO ══ */}
      {etapa === 'confirmacao' && importResult && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,.12)', color: 'var(--g400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
            <i className="ti ti-circle-check" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            {importResult.importados} lançamento{importResult.importados !== 1 ? 's' : ''} importado{importResult.importados !== 1 ? 's' : ''} com sucesso
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text3)', marginTop: 6 }}>
            Você pode revisar ou editar cada um no Extrato.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <Button variant="primary" icon="ti-list-search" onClick={() => onNavigate('extrato', {})}>Ver no Extrato</Button>
            {podeDesfazer && (
              <Button variant="ghost" icon="ti-arrow-back-up" onClick={desfazer}>Desfazer importação</Button>
            )}
            <Button variant="ghost" icon="ti-plus" onClick={resetar}>Importar outro</Button>
          </div>
          {podeDesfazer && (
            <div style={{ fontSize: 11, color: 'var(--color-text3)', marginTop: 10 }}>
              O botão "Desfazer" fica disponível por 5 minutos.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
