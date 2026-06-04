import { getAccessToken } from './auth.js'

const SHEET_ID = '1iBZrSW2p4Ro3SzuthE0lL9w9BxoUc2vHINShKgBJMts'
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets'

const headers = async () => ({
  'Authorization': `Bearer ${await getAccessToken()}`,
  'Content-Type':  'application/json',
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRange = async (range) => {
  const res = await fetch(`${BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}`, {
    headers: await headers(),
  })
  if (!res.ok) throw new Error(`Sheets GET error: ${res.status}`)
  const data = await res.json()
  return data.values || []
}

const setRange = async (range, values) => {
  const res = await fetch(
    `${BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    { method: 'PUT', headers: await headers(), body: JSON.stringify({ range, values }) }
  )
  if (!res.ok) throw new Error(`Sheets PUT error: ${res.status}`)
  return res.json()
}

const appendRows = async (range, values) => {
  const res = await fetch(
    `${BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', headers: await headers(), body: JSON.stringify({ range, values }) }
  )
  if (!res.ok) throw new Error(`Sheets APPEND error: ${res.status}`)
  return res.json()
}

const batchUpdate = async (requests) => {
  const res = await fetch(`${BASE}/${SHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ requests }),
  })
  if (!res.ok) throw new Error(`Sheets batchUpdate error: ${res.status}`)
  return res.json()
}

// ── Setup: cria as abas se não existirem ──────────────────────────────────────

export const setupSheets = async () => {
  const res  = await fetch(`${BASE}/${SHEET_ID}?fields=sheets.properties.title`, { headers: await headers() })
  const data = await res.json()
  const existing = data.sheets.map(s => s.properties.title)

  const needed = ['lancamentos', 'fixos', 'parcelas', 'contas', 'transferencias', 'metas']
  const toCreate = needed.filter(n => !existing.includes(n))

  if (toCreate.length === 0) return

  await batchUpdate(toCreate.map(title => ({ addSheet: { properties: { title } } })))

  // Cabeçalhos
  const cabecalhos = {
    lancamentos:    [['id','data','desc','tipo','cat','valor','contaId','mes']],
    fixos:          [['id','desc','valor','cat','contaId','ativo']],
    parcelas:       [['id','desc','valor','cartao','atual','total']],
    contas:         [['id','nome','tipo','saldo','cor']],
    transferencias: [['id','desc','origemId','destinoId','valor','data','mes']],
    metas:          [['id','nome','valor','atual','mensal']],
  }
  for (const aba of toCreate) {
    await setRange(`${aba}!A1`, cabecalhos[aba])
  }
}

// ── Parse rows → objects ──────────────────────────────────────────────────────

const rowsToObjects = (rows) => {
  if (rows.length < 2) return []
  const [headers, ...data] = rows
  return data.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  )
}

const parseNum = (v) => parseFloat(v) || 0
const parseBool = (v) => v === 'true' || v === true

// ── Leitura completa ──────────────────────────────────────────────────────────

export const loadAllData = async () => {
  const [lancs, fixos, parcelas, contas, transfers, metas] = await Promise.all([
    getRange('lancamentos!A:H'),
    getRange('fixos!A:F'),
    getRange('parcelas!A:F'),
    getRange('contas!A:E'),
    getRange('transferencias!A:G'),
    getRange('metas!A:E'),
  ])

  return {
    lancamentos: rowsToObjects(lancs).map(r => ({
      ...r, valor: parseNum(r.valor), contaId: r.contaId ? parseInt(r.contaId) : null,
    })),
    fixos: rowsToObjects(fixos).map(r => ({
      ...r, valor: parseNum(r.valor), contaId: r.contaId ? parseInt(r.contaId) : null,
      id: parseInt(r.id), ativo: parseBool(r.ativo),
    })),
    parcelas: rowsToObjects(parcelas).map(r => ({
      ...r, valor: parseNum(r.valor), id: parseInt(r.id),
      atual: parseInt(r.atual), total: parseInt(r.total),
    })),
    contas: rowsToObjects(contas).map(r => ({
      ...r, saldo: parseNum(r.saldo), id: parseInt(r.id),
    })),
    transferencias: rowsToObjects(transfers).map(r => ({
      ...r, valor: parseNum(r.valor),
      origemId: parseInt(r.origemId), destinoId: parseInt(r.destinoId),
    })),
    metas: rowsToObjects(metas).map(r => ({
      ...r, valor: parseNum(r.valor), atual: parseNum(r.atual),
      mensal: parseNum(r.mensal), id: parseInt(r.id),
    })),
    reserva: 0,
    investType: 'CDI (cofrinho)',
    orcamento: null,
    nextId: 100,
  }
}

// ── Escrita por aba (reescreve tudo) ──────────────────────────────────────────

export const saveSheet = async (aba, items, toRow) => {
  const rows = items.map(toRow)
  const cabecalhos = {
    lancamentos:    ['id','data','desc','tipo','cat','valor','contaId','mes'],
    fixos:          ['id','desc','valor','cat','contaId','ativo'],
    parcelas:       ['id','desc','valor','cartao','atual','total'],
    contas:         ['id','nome','tipo','saldo','cor'],
    transferencias: ['id','desc','origemId','destinoId','valor','data','mes'],
    metas:          ['id','nome','valor','atual','mensal'],
  }
  await setRange(`${aba}!A1`, [cabecalhos[aba], ...rows])
}

export const saveLancamentos    = (items) => saveSheet('lancamentos', items,    r => [r.id, r.data, r.desc, r.tipo, r.cat||'', r.valor, r.contaId||'', r.mes])
export const saveFixos          = (items) => saveSheet('fixos', items,          r => [r.id, r.desc, r.valor, r.cat, r.contaId||'', r.ativo])
export const saveParcelas       = (items) => saveSheet('parcelas', items,       r => [r.id, r.desc, r.valor, r.cartao, r.atual, r.total])
export const saveContas         = (items) => saveSheet('contas', items,         r => [r.id, r.nome, r.tipo, r.saldo, r.cor])
export const saveTransferencias = (items) => saveSheet('transferencias', items, r => [r.id, r.desc||'', r.origemId, r.destinoId, r.valor, r.data, r.mes])
export const saveMetas          = (items) => saveSheet('metas', items,          r => [r.id, r.nome, r.valor, r.atual, r.mensal])
