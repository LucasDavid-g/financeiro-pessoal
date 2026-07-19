// Importação de extrato CSV — lógica pura, testável em node (sem React/Firebase).
// Filosofia: "fail safe, never fail silent" — cada etapa falha de forma explícita
// e recuperável; parseLinha nunca lança exceção, sempre retorna um objeto de erro.

// ── Normalização de texto ──────────────────────────────────────────────
// lowercase + remove acentos + colapsa espaços. Usado em detecção de banco,
// categorização e similaridade de descrição.
const normTxt = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// ── 1. Encoding ────────────────────────────────────────────────────────
// Detecta UTF-8 vs ISO-8859-1, remove BOM, retorna string decodificada.
export function detectEncoding(buffer) {
  // Já é string: só remove BOM textual (﻿)
  if (typeof buffer === 'string') return buffer.replace(/^﻿/, '')

  let bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  // BOM UTF-8: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  // Tenta UTF-8 estrito; se houver byte inválido, assume ISO-8859-1 (latin1)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes)
  }
}

// ── 2. Detecção de banco pelo cabeçalho ────────────────────────────────
export function detectBanco(primeiraLinha) {
  const h = normTxt(primeiraLinha)
  const temPV = String(primeiraLinha ?? '').includes(';')

  // Nubank: date,category,title,amount
  if (h.includes('date') && h.includes('amount') && h.includes('title')) return 'nubank'
  // Inter: Data,Descrição,Valor,Tipo  (vírgula)
  if (!temPV && h.includes('data') && h.includes('descricao') && h.includes('valor') && h.includes('tipo')) return 'inter'
  // Itaú: Data;Histórico;Docto.;Crédito;Débito;Saldo  (ponto-e-vírgula)
  if (temPV && h.includes('historico') && h.includes('saldo') && (h.includes('debito') || h.includes('credito'))) return 'itau'
  // C6: cabeçalho de fatura ("Data de Compra" / "Final do Cartão")
  if (h.includes('data de compra') || h.includes('final do cartao')) return 'c6'
  // Bradesco: contém "historico" e ";" (checado depois de Itaú, que é mais específico)
  if (temPV && h.includes('historico')) return 'bradesco'

  return 'generic'
}

// ── 3. Normalização de valores e datas ─────────────────────────────────
// Retorna número COM sinal (negativo para despesa/débito/parênteses) ou NaN.
export function normalizarValor(str) {
  if (str == null) return NaN
  let s = String(str).trim()
  if (s === '') return NaN

  let negativo = false
  // Formato contábil: (150,00) = negativo
  if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1) }
  if (s.includes('-')) negativo = true

  // Remove R$, espaços e o sinal (já capturado)
  s = s.replace(/r\$/i, '').replace(/\s/g, '').replace(/-/g, '').replace(/\+/g, '')

  // Se tem vírgula, ela é o separador decimal (pt-BR): remove pontos de milhar
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')

  if (s === '' || !/^\d*\.?\d+$/.test(s)) return NaN
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return NaN
  return negativo ? -n : n
}

// Retorna 'YYYY-MM-DD' válido ou null.
export function normalizarData(str) {
  if (str == null) return null
  const s = String(str).trim()

  // AAAA-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const [, y, mo, d] = m
    if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null
    return `${y}-${mo}-${d}`
  }
  // DD/MM/AAAA ou DD/MM/AA
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = '20' + y
    if (+d < 1 || +d > 31 || +mo < 1 || +mo > 12) return null
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

// ── CSV split respeitando aspas duplas ─────────────────────────────────
function splitCSV(linha, sep) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]
    if (inQ) {
      if (ch === '"') {
        if (linha[i + 1] === '"') { cur += '"'; i++ }
        else inQ = false
      } else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === sep) { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

const limparDesc = (s) => String(s ?? '').replace(/^"|"$/g, '').replace(/\s+/g, ' ').trim()

// Heurística p/ formatos genéricos/c6: escolhe a célula de valor e a de descrição.
const pickValor = (cols) => {
  // última célula que parece um valor monetário (tem dígito e vírgula/ponto/parênteses)
  for (let i = cols.length - 1; i >= 0; i--) {
    const c = cols[i]
    if (/\d/.test(c) && /[,.()]/.test(c)) {
      const v = normalizarValor(c)
      if (Number.isFinite(v) && v !== 0) return v
    }
  }
  return NaN
}
const pickDesc = (cols) => {
  // célula de texto mais longa que não é data nem valor puro
  let melhor = ''
  for (const c of cols) {
    if (normalizarData(c)) continue
    if (/^[\d.,\-()R$\s]+$/i.test(c)) continue
    if (c.length > melhor.length) melhor = c
  }
  return melhor
}

// ── 4. Parse de uma linha ──────────────────────────────────────────────
const SEP = { nubank: ',', inter: ',', itau: ';', bradesco: ';', c6: ';' }

// Retorna { data, desc, valor (>0), tipo } OU { erro, indice, linha }.
export function parseLinha(linha, banco, indice) {
  const erro = (motivo) => ({ erro: motivo, indice, linha })
  if (linha == null || String(linha).trim() === '') return erro('linha vazia')

  const sep = banco === 'generic' || banco === 'c6'
    ? (String(linha).includes(';') ? ';' : ',')
    : (SEP[banco] || ',')
  const cols = splitCSV(String(linha), sep)

  let data = null, descRaw = '', valor = NaN, tipo = 'despesa'

  switch (banco) {
    case 'nubank': { // date,category,title,amount
      if (cols.length < 4) return erro('colunas faltando')
      data = normalizarData(cols[0])
      descRaw = cols[2]
      const v = normalizarValor(cols[3])
      if (!Number.isFinite(v)) return erro('valor invalido')
      tipo = v >= 0 ? 'despesa' : 'receita' // fatura: amount positivo = compra
      valor = Math.abs(v)
      break
    }
    case 'itau': { // Data;Histórico;Docto.;Crédito;Débito;Saldo
      if (cols.length < 5) return erro('colunas faltando')
      data = normalizarData(cols[0])
      descRaw = cols[1]
      const cred = normalizarValor(cols[3])
      const deb = normalizarValor(cols[4])
      if (Number.isFinite(cred) && cred !== 0) { tipo = 'receita'; valor = Math.abs(cred) }
      else if (Number.isFinite(deb) && deb !== 0) { tipo = 'despesa'; valor = Math.abs(deb) }
      else return erro('valor invalido')
      break
    }
    case 'inter': { // Data,Descrição,Valor,Tipo
      if (cols.length < 3) return erro('colunas faltando')
      data = normalizarData(cols[0])
      descRaw = cols[1]
      const v = normalizarValor(cols[2])
      if (!Number.isFinite(v)) return erro('valor invalido')
      const t = normTxt(cols[3] || '')
      if (t.includes('deb') || t.includes('saida') || t.includes('pagamento')) tipo = 'despesa'
      else if (t.includes('cred') || t.includes('entrada') || t.includes('recebi')) tipo = 'receita'
      else tipo = v < 0 ? 'despesa' : 'receita'
      valor = Math.abs(v)
      break
    }
    case 'bradesco': { // Data;Historico;...;Valor (négativo = débito)
      if (cols.length < 3) return erro('colunas faltando')
      data = normalizarData(cols[0])
      descRaw = cols[1]
      const v = pickValor(cols)
      if (!Number.isFinite(v)) return erro('valor invalido')
      tipo = v < 0 ? 'despesa' : 'receita'
      valor = Math.abs(v)
      break
    }
    case 'c6': { // fatura de cartão — heurística
      if (cols.length < 3) return erro('colunas faltando')
      data = normalizarData(cols[0]) || (() => { for (const c of cols) { const d = normalizarData(c); if (d) return d } return null })()
      descRaw = pickDesc(cols)
      const v = pickValor(cols)
      if (!Number.isFinite(v)) return erro('valor invalido')
      tipo = v >= 0 ? 'despesa' : 'receita'
      valor = Math.abs(v)
      break
    }
    default: { // generic — best effort
      for (const c of cols) { const d = normalizarData(c); if (d) { data = d; break } }
      descRaw = pickDesc(cols)
      const v = pickValor(cols)
      if (!Number.isFinite(v)) return erro('valor invalido')
      tipo = v < 0 ? 'despesa' : 'receita'
      valor = Math.abs(v)
    }
  }

  if (!data) return erro('data invalida')
  if (!Number.isFinite(valor) || valor <= 0) return erro('valor invalido')
  return { data, desc: limparDesc(descRaw), valor, tipo }
}

// ── 5. Parse do arquivo inteiro ────────────────────────────────────────
export function parseCSV(conteudo) {
  if (conteudo == null || String(conteudo).trim() === '') {
    return { banco: 'generic', transacoes: [], erros: [{ indice: -1, linha: '', motivo: 'arquivo vazio' }], ignoradas: 0 }
  }

  const linhas = String(conteudo).split(/\r\n|\n|\r/)
  const banco = detectBanco(linhas[0] || '')
  const transacoes = []
  const erros = []
  let ignoradas = 0

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    if (linha == null || linha.trim() === '') { ignoradas++; continue }
    // Cabeçalho reconhecido (primeira linha) — pula
    if (i === 0 && banco !== 'generic') { ignoradas++; continue }
    // Linha sem nenhum dígito é quase certamente cabeçalho/rodapé/separador
    if (!/\d/.test(linha)) { ignoradas++; continue }

    const r = parseLinha(linha, banco, i)
    if (r.erro) {
      erros.push({ indice: i, linha, motivo: r.erro })
      // Log de diagnóstico SEM dados financeiros: só metadados do erro.
      console.warn('[csvImport] linha ignorada:', { motivo: r.erro, banco, indice: i })
    } else {
      transacoes.push({ ...r, linhaOriginal: linha })
    }
  }

  return { banco, transacoes, erros, ignoradas }
}

// ── 6. Detecção de duplicatas ──────────────────────────────────────────
function jaccard(a, b) {
  const sa = new Set(normTxt(a).split(' ').filter(Boolean))
  const sb = new Set(normTxt(b).split(' ').filter(Boolean))
  if (sa.size === 0 && sb.size === 0) return 1
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter++
  const union = sa.size + sb.size - inter
  return union === 0 ? 0 : inter / union
}

// Compara data (exata) + valor (exato) + tipo + similaridade de descrição.
// Só compara contra lançamentos EXISTENTES (não cruza linhas do próprio lote).
export function detectarDuplicata(transacao, lancamentosExistentes) {
  let melhor = { score: 0, match: null }
  for (const l of lancamentosExistentes || []) {
    if (l.data !== transacao.data) continue
    if (l.tipo && transacao.tipo && l.tipo !== transacao.tipo) continue // estorno (receita) ≠ despesa
    if (Math.abs((l.valor || 0) - Math.abs(transacao.valor)) > 0.011) continue
    // data + valor + tipo batem → 60 de base, descrição idêntica leva a 100
    const score = 60 + Math.round(jaccard(l.desc || '', transacao.desc || '') * 40)
    if (score > melhor.score) melhor = { score, match: l }
  }
  const score = melhor.score
  const tipo = score >= 90 ? 'exata' : score >= 60 ? 'provavel' : score >= 30 ? 'possivel' : 'nova'
  return { score, match: melhor.match, tipo }
}

// ── 7. Categorização automática ────────────────────────────────────────
// NOTA: o app tem CATEGORIES = alimentação/moradia/transporte/saúde/lazer/pets/
// assinatura/cartão/outro. "compras" e "transferência" NÃO existem, então
// mapeamos para 'outro' (com confiança média/baixa = sinal de revisão).
const REGRAS_CAT = [
  // estorno primeiro: "ESTORNO COMPRA SHOPEE" é receita, não compras
  { kws: ['estorno', 'cashback', 'reembolso'],                          cat: 'outro',       tipo: 'receita', conf: 'media' },
  { kws: ['ifood', 'rappi', 'ubereats', 'uber eats', 'ze delivery'],    cat: 'alimentação', tipo: 'despesa', conf: 'alta'  },
  { kws: ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'prime video', 'youtube premium'], cat: 'assinatura', tipo: 'despesa', conf: 'alta' },
  { kws: ['uber', '99', 'cabify', 'shell', 'posto', 'ipiranga', 'petrobras'], cat: 'transporte', tipo: 'despesa', conf: 'alta' },
  { kws: ['farmacia', 'drogaria', 'raia', 'drogasil', 'pacheco', 'academia', 'smartfit', 'smart fit', 'gympass', 'totalpass'], cat: 'saúde', tipo: 'despesa', conf: 'alta' },
  { kws: ['shopee', 'amazon', 'mercado livre', 'mercadolivre', 'magalu', 'aliexpress'], cat: 'outro', tipo: 'despesa', conf: 'media' }, // "compras"
  { kws: ['pix', 'ted', 'doc', 'transferencia'],                        cat: 'outro',       tipo: 'despesa', conf: 'baixa' }, // "transferência" → revisar
  { kws: ['iof', 'juros', 'multa', 'tarifa', 'anuidade'],               cat: 'outro',       tipo: 'despesa', conf: 'baixa' }, // taxas → revisar
]

export function categorizarAuto(desc) {
  const d = normTxt(desc)
  if (!d) return { cat: 'outro', confianca: 'baixa', tipo: 'despesa' }
  const tokens = new Set(d.split(' ').filter(Boolean))
  const has = (kw) => (kw.includes(' ') ? d.includes(kw) : tokens.has(kw))

  for (const r of REGRAS_CAT) {
    if (r.kws.some(has)) return { cat: r.cat, confianca: r.conf, tipo: r.tipo }
  }
  return { cat: 'outro', confianca: 'baixa', tipo: 'despesa' }
}

// ── 8. Validação do arquivo ────────────────────────────────────────────
export function validarArquivo(arquivo) {
  if (!arquivo) return { valido: false, erro: 'Nenhum arquivo selecionado.' }
  const nome = String(arquivo.name || '').toLowerCase()
  if (!/\.(csv|txt|ofx)$/.test(nome)) {
    return { valido: false, erro: 'Formato não suportado. Use um arquivo .csv, .txt ou .ofx.' }
  }
  const MAX = 5 * 1024 * 1024
  if (typeof arquivo.size === 'number' && arquivo.size > MAX) {
    return { valido: false, erro: 'Arquivo muito grande (máximo 5 MB).' }
  }
  return { valido: true, erro: null }
}
