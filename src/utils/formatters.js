export const fmt = (value) =>
  'R$ ' + Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const getMonthKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`
