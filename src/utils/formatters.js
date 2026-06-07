export const fmt = (value) =>
  'R$ ' + Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const getMonthKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`

// Formatação compacta para espaços apertados (ex: statChips do Dashboard em mobile).
// R$ 1.850,00 -> R$ 1,85 mil · R$ 1.450.000,00 -> R$ 1,45 mi
// Mantém o formato completo abaixo de R$ 1.000 (não compensa abreviar).
export const fmtCompact = (value) => {
  const n = Number(value)
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return 'R$ ' + (n / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi'
  }
  if (abs >= 1_000) {
    return 'R$ ' + (n / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mil'
  }
  return fmt(n)
}
