const applyFilters = (lancamentos, inicio, fim, filters = {}) => {
  let data = [...lancamentos].filter((l) => l.data >= inicio && l.data <= fim)
  if (filters.tipo)    data = data.filter((l) => l.tipo === filters.tipo)
  if (filters.contaId) data = data.filter((l) => l.contaId === parseInt(filters.contaId))
  if (filters.busca)   data = data.filter((l) => l.desc.toLowerCase().includes(filters.busca.toLowerCase()))
  if (filters.sort === 'data-asc')        data.sort((a, b) => a.data.localeCompare(b.data))
  else if (filters.sort === 'valor-desc') data.sort((a, b) => b.valor - a.valor)
  else if (filters.sort === 'valor-asc')  data.sort((a, b) => a.valor - b.valor)
  else data.sort((a, b) => b.data.localeCompare(a.data))
  return data
}

export const exportToCSV = (lancamentos, contas, inicio, fim, filters = {}) => {
  const data   = applyFilters(lancamentos, inicio, fim, filters)
  const header = 'Data,Descrição,Tipo,Categoria,Valor,Conta'
  const rows   = data.map((l) => {
    const conta = contas.find((c) => c.id === l.contaId)
    return [l.data, `"${l.desc}"`, l.tipo, l.cat || l.tipo, l.valor.toFixed(2), conta?.nome || ''].join(',')
  })
  download('﻿' + [header, ...rows].join('\n'), `extrato-${inicio}_${fim}.csv`, 'text/csv;charset=utf-8;')
}

export const exportToPDF = (lancamentos, contas, inicio, fim, filters = {}) => {
  const data     = applyFilters(lancamentos, inicio, fim, filters)
  const mesLabel = `${inicio} a ${fim}`
  const totalRec = data.filter(l => l.tipo === 'receita').reduce((s,l) => s+l.valor, 0)
  const totalDes = data.filter(l => l.tipo === 'despesa').reduce((s,l) => s+l.valor, 0)
  const fmt = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const rows = data.map((l) => {
    const conta = contas.find((c) => c.id === l.contaId)
    const cor   = l.tipo === 'receita' ? '#1D9E75' : '#E24B4A'
    return `<tr>
      <td>${l.data}</td>
      <td>${l.desc}</td>
      <td>${l.cat || l.tipo}</td>
      <td>${conta?.nome || '—'}</td>
      <td style="text-align:right;color:${cor};font-weight:500">${l.tipo === 'receita' ? '+' : '-'}${fmt(l.valor)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Extrato ${mesLabel}</title>
  <style>
    body { font-family: 'DM Sans', monospace; max-width: 700px; margin: 40px auto; color: #1a1917; font-size: 13px; }
    h1 { font-size: 18px; border-bottom: 1px solid #e8e6e0; padding-bottom: 10px; margin-bottom: 4px; }
    .sub { font-size: 11px; color: #8a8780; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #8a8780; padding: 8px 6px; border-bottom: 1px solid #e8e6e0; }
    td { padding: 8px 6px; border-bottom: .5px solid #f0ede8; }
    .summary { display: flex; gap: 24px; margin-bottom: 20px; }
    .summary div { background: #f4f3f0; border-radius: 8px; padding: 10px 16px; }
    .summary .label { font-size: 10px; text-transform: uppercase; color: #8a8780; }
    .summary .value { font-size: 16px; font-weight: 500; margin-top: 2px; }
  </style></head><body>
  <h1>EXTRATO — ${mesLabel.toUpperCase()}</h1>
  <div class="sub">${data.length} lançamentos</div>
  <div class="summary">
    <div><div class="label">Receitas</div><div class="value" style="color:#1D9E75">${fmt(totalRec)}</div></div>
    <div><div class="label">Despesas</div><div class="value" style="color:#E24B4A">${fmt(totalDes)}</div></div>
    <div><div class="label">Saldo</div><div class="value" style="color:${totalRec-totalDes>=0?'#1D9E75':'#E24B4A'}">${fmt(totalRec-totalDes)}</div></div>
  </div>
  <table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th style="text-align:right">Valor</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <script>window.onload = () => window.print()</script>
  </body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

const download = (content, filename, type) => {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
