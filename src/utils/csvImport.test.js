// Testes de csvImport.js — rodar com: node --test src/utils/csvImport.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  detectEncoding, detectBanco, normalizarValor, normalizarData,
  parseLinha, parseCSV, detectarDuplicata, categorizarAuto, validarArquivo,
} from './csvImport.js'

// ── ENCODING ────────────────────────────────────────────────────────────
test('UTF-8 com BOM → processa e remove BOM', () => {
  const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Café,10', 'utf8')])
  assert.equal(detectEncoding(buf), 'Café,10')
})

test('ISO-8859-1 com acentos → processa corretamente', () => {
  const buf = Buffer.from('São Paulo;Histórico', 'latin1')
  assert.equal(detectEncoding(buf), 'São Paulo;Histórico')
})

test('string com BOM textual → remove BOM', () => {
  assert.equal(detectEncoding('﻿abc'), 'abc')
})

// ── DETECÇÃO DE BANCO ─────────────────────────────────────────────────────
test('detecta Nubank (date,category,title,amount)', () => {
  assert.equal(detectBanco('date,category,title,amount'), 'nubank')
})
test('detecta Itaú (ponto-e-vírgula com Histórico/Saldo/Débito)', () => {
  assert.equal(detectBanco('Data;Histórico;Docto.;Crédito;Débito;Saldo'), 'itau')
})
test('detecta Inter (Data,Descrição,Valor,Tipo)', () => {
  assert.equal(detectBanco('Data,Descrição,Valor,Tipo'), 'inter')
})
test('CSV desconhecido → generic', () => {
  assert.equal(detectBanco('Coluna A,Coluna B,Coluna C'), 'generic')
})

// ── PARSE DE VALORES ──────────────────────────────────────────────────────
test('normalizarValor', () => {
  assert.equal(normalizarValor('R$ 150,00'), 150)
  assert.equal(normalizarValor('-150,00'), -150)
  assert.equal(normalizarValor('(150,00)'), -150)
  assert.equal(normalizarValor('1.500,00'), 1500)
  assert.ok(Number.isNaN(normalizarValor('abc')))
  assert.ok(Number.isNaN(normalizarValor('')))
})

// ── PARSE DE DATAS ────────────────────────────────────────────────────────
test('normalizarData', () => {
  assert.equal(normalizarData('25/06/2026'), '2026-06-25')
  assert.equal(normalizarData('2026-06-25'), '2026-06-25')
  assert.equal(normalizarData('5/6/2026'), '2026-06-05')
  assert.equal(normalizarData('data inválida'), null)
  assert.equal(normalizarData('32/13/2026'), null)
})

// ── PARSE DE LINHA / FORMATOS DE BANCO ────────────────────────────────────
test('Nubank: compra vira despesa positiva', () => {
  const r = parseLinha('2026-06-25,eat,iFood,45.90', 'nubank', 1)
  assert.deepEqual(r, { data: '2026-06-25', desc: 'iFood', valor: 45.9, tipo: 'despesa' })
})
test('Nubank: amount negativo vira receita (estorno)', () => {
  const r = parseLinha('2026-06-25,eat,Estorno,-30.00', 'nubank', 1)
  assert.equal(r.tipo, 'receita')
  assert.equal(r.valor, 30)
})
test('Itaú: débito → despesa, crédito → receita', () => {
  const deb = parseLinha('25/06/2026;PAGAMENTO;123;;150,00;1000,00', 'itau', 1)
  assert.deepEqual(deb, { data: '2026-06-25', desc: 'PAGAMENTO', valor: 150, tipo: 'despesa' })
  const cred = parseLinha('24/06/2026;SALARIO;456;5000,00;;6150,00', 'itau', 2)
  assert.deepEqual(cred, { data: '2026-06-24', desc: 'SALARIO', valor: 5000, tipo: 'receita' })
})
test('Itaú: valor entre parênteses vira despesa', () => {
  const r = parseLinha('25/06/2026;COMPRA;123;;(150,00);1000,00', 'itau', 1)
  assert.equal(r.tipo, 'despesa')
  assert.equal(r.valor, 150)
})
test('linha com colunas faltando → erro com índice', () => {
  const r = parseLinha('so,duas', 'nubank', 7)
  assert.equal(r.erro, 'colunas faltando')
  assert.equal(r.indice, 7)
})
test('linha com valor inválido → erro explícito', () => {
  const r = parseLinha('2026-06-25,eat,iFood,abc', 'nubank', 3)
  assert.equal(r.erro, 'valor invalido')
})
test('linha em branco → erro linha vazia (não lança)', () => {
  assert.equal(parseLinha('   ', 'nubank', 1).erro, 'linha vazia')
})

// ── PARSE DO ARQUIVO ──────────────────────────────────────────────────────
test('parseCSV Nubank completo', () => {
  const csv = 'date,category,title,amount\n2026-06-25,eat,iFood,45.90\n2026-06-24,transport,Uber,20.00'
  const r = parseCSV(csv)
  assert.equal(r.banco, 'nubank')
  assert.equal(r.transacoes.length, 2)
  assert.equal(r.erros.length, 0)
})
test('arquivo só com cabeçalho → transacoes e erros vazios', () => {
  const r = parseCSV('date,category,title,amount')
  assert.deepEqual(r.transacoes, [])
  assert.deepEqual(r.erros, [])
})
test('arquivo vazio → erro explícito', () => {
  const r = parseCSV('')
  assert.equal(r.transacoes.length, 0)
  assert.equal(r.erros[0].motivo, 'arquivo vazio')
})
test('linha em branco no meio → ignorada, não vira erro', () => {
  const csv = 'date,category,title,amount\n2026-06-25,eat,iFood,45.90\n\n2026-06-24,transport,Uber,20.00'
  const r = parseCSV(csv)
  assert.equal(r.transacoes.length, 2)
  assert.equal(r.erros.length, 0)
  assert.ok(r.ignoradas >= 2) // cabeçalho + linha vazia
})
test('CSV genérico desconhecido não lança', () => {
  assert.doesNotThrow(() => parseCSV('Coluna A,Coluna B\nfoo,bar'))
  assert.equal(parseCSV('Coluna A,Coluna B\nfoo,bar').banco, 'generic')
})

// ── DUPLICATAS ────────────────────────────────────────────────────────────
const existentes = [{ data: '2026-06-25', valor: 45.9, tipo: 'despesa', desc: 'iFood Restaurante' }]

test('transação idêntica → exata (score 90+)', () => {
  const r = detectarDuplicata({ data: '2026-06-25', valor: 45.9, tipo: 'despesa', desc: 'iFood Restaurante' }, existentes)
  assert.equal(r.tipo, 'exata')
  assert.ok(r.score >= 90)
})
test('mesma data+valor, desc diferente → provável (60-89)', () => {
  const r = detectarDuplicata({ data: '2026-06-25', valor: 45.9, tipo: 'despesa', desc: 'Uber Viagem' }, existentes)
  assert.equal(r.tipo, 'provavel')
  assert.ok(r.score >= 60 && r.score <= 89)
})
test('valor diferente → nova (<30)', () => {
  const r = detectarDuplicata({ data: '2026-06-25', valor: 99, tipo: 'despesa', desc: 'x' }, existentes)
  assert.equal(r.tipo, 'nova')
  assert.ok(r.score < 30)
})
test('dois pagamentos iguais no lote não se auto-duplicam (compara só existentes)', () => {
  // segundo pagamento comparado contra base vazia → nova
  const r = detectarDuplicata({ data: '2026-06-25', valor: 45.9, tipo: 'despesa', desc: 'iFood Restaurante' }, [])
  assert.equal(r.tipo, 'nova')
})
test('estorno (receita) não é duplicata de despesa de mesmo valor', () => {
  const r = detectarDuplicata({ data: '2026-06-25', valor: 45.9, tipo: 'receita', desc: 'Estorno iFood' }, existentes)
  assert.equal(r.tipo, 'nova')
})

// ── CATEGORIZAÇÃO ─────────────────────────────────────────────────────────
test('iFood → alimentação alta', () => {
  const r = categorizarAuto('IFOOD*RESTAURANTE')
  assert.equal(r.cat, 'alimentação')
  assert.equal(r.confianca, 'alta')
  assert.equal(r.tipo, 'despesa')
})
test('PIX ENVIADO → transferência, confiança baixa (revisar)', () => {
  const r = categorizarAuto('PIX ENVIADO 11987654321')
  assert.equal(r.confianca, 'baixa')
  assert.equal(r.cat, 'transferência')
})
test('Shopee → compras', () => {
  assert.equal(categorizarAuto('SHOPEE *PEDIDO 123').cat, 'compras')
})
test('categorias sugeridas existem em CATEGORIES', async () => {
  const { CATEGORIES } = await import('../data/defaults.js')
  const amostras = ['IFOOD*X', 'SHOPEE', 'PIX ENVIADO', 'NETFLIX', 'UBER *TRIP', 'DROGARIA', 'IOF', '']
  for (const d of amostras) {
    assert.ok(CATEGORIES.includes(categorizarAuto(d).cat), `cat inválida para "${d}": ${categorizarAuto(d).cat}`)
  }
})
test('ESTORNO → receita (não compras)', () => {
  const r = categorizarAuto('ESTORNO COMPRA SHOPEE')
  assert.equal(r.tipo, 'receita')
})
test('descrição vazia → outro, baixa', () => {
  const r = categorizarAuto('')
  assert.equal(r.cat, 'outro')
  assert.equal(r.confianca, 'baixa')
})
test('Uber Eats → alimentação (não transporte)', () => {
  assert.equal(categorizarAuto('UBER EATS SP').cat, 'alimentação')
})
test('Uber comum → transporte', () => {
  assert.equal(categorizarAuto('UBER *TRIP').cat, 'transporte')
})

// ── VALIDAÇÃO DE ARQUIVO ──────────────────────────────────────────────────
test('validarArquivo', () => {
  assert.equal(validarArquivo({ name: 'extrato.csv', size: 1000 }).valido, true)
  assert.equal(validarArquivo({ name: 'foto.png', size: 1000 }).valido, false)
  assert.equal(validarArquivo({ name: 'x.csv', size: 6 * 1024 * 1024 }).valido, false)
  assert.equal(validarArquivo(null).valido, false)
})
