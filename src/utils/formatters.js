import { MONTHS_SHORT, MONTHS_FULL } from '../data/defaults.js'

export const fmt = (value) =>
  'R$ ' + Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const getMonthKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`

export const monthLabel = (year, month, format = 'short') =>
  format === 'short'
    ? `${MONTHS_SHORT[month]}/${String(year).slice(2)}`
    : `${MONTHS_FULL[month]} ${year}`

export const getPastMonths = (selYear, selMonth, count = 6) => {
  const result = []
  for (let i = count - 1; i >= 0; i--) {
    let m = selMonth - i
    let y = selYear
    while (m < 0) { m += 12; y-- }
    result.push({ year: y, month: m })
  }
  return result
}

export const formatDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
