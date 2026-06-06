import { useState } from 'react'

const toISO = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const addDays = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export const PRESETS = [
  { id: 'hoje',       label: 'Hoje'           },
  { id: '7d',         label: 'Últimos 7 dias'  },
  { id: '30d',        label: 'Últimos 30 dias' },
  { id: 'este-mes',   label: 'Este mês'        },
  { id: 'mes-ant',    label: 'Mês anterior'    },
  { id: 'trimestre',  label: 'Este trimestre'  },
  { id: 'ano',        label: 'Este ano'        },
  { id: 'custom',     label: 'Personalizado'   },
]

export function getPresetRange(preset) {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth()
  switch (preset) {
    case 'hoje':
      return { inicio: toISO(now), fim: toISO(now) }
    case '7d':
      return { inicio: toISO(addDays(now, -6)), fim: toISO(now) }
    case '30d':
      return { inicio: toISO(addDays(now, -29)), fim: toISO(now) }
    case 'este-mes':
      return { inicio: toISO(new Date(y, m, 1)), fim: toISO(new Date(y, m + 1, 0)) }
    case 'mes-ant':
      return { inicio: toISO(new Date(y, m - 1, 1)), fim: toISO(new Date(y, m, 0)) }
    case 'trimestre': {
      const q = Math.floor(m / 3)
      return { inicio: toISO(new Date(y, q * 3, 1)), fim: toISO(new Date(y, q * 3 + 3, 0)) }
    }
    case 'ano':
      return { inicio: toISO(new Date(y, 0, 1)), fim: toISO(new Date(y, 11, 31)) }
    default:
      return { inicio: toISO(new Date(y, m, 1)), fim: toISO(new Date(y, m + 1, 0)) }
  }
}

export function periodLabel(period) {
  const { inicio, fim, preset } = period
  const fmtBR = (iso) => {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  switch (preset) {
    case 'hoje':      return `Hoje · ${fmtBR(inicio)}`
    case '7d':        return 'Últimos 7 dias'
    case '30d':       return 'Últimos 30 dias'
    case 'este-mes': {
      const [y, m] = inicio.split('-')
      const names  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      return `Este mês · ${names[parseInt(m)-1]} ${y}`
    }
    case 'mes-ant': {
      const [y, m] = inicio.split('-')
      const names  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      return `Mês ant. · ${names[parseInt(m)-1]} ${y}`
    }
    case 'trimestre': {
      const q = Math.ceil(parseInt(inicio.split('-')[1]) / 3)
      return `T${q} · ${inicio.split('-')[0]}`
    }
    case 'ano':
      return `Ano · ${inicio.split('-')[0]}`
    default:
      return `${fmtBR(inicio)} → ${fmtBR(fim)}`
  }
}

export function usePeriod() {
  const defaultPreset = 'este-mes'
  const defaultRange  = getPresetRange(defaultPreset)

  const [period, setPeriod] = useState({ ...defaultRange, preset: defaultPreset })

  const setPreset = (preset) => {
    if (preset === 'custom') {
      setPeriod(p => ({ ...p, preset: 'custom' }))
    } else {
      const range = getPresetRange(preset)
      setPeriod({ ...range, preset })
    }
  }

  const setRange = (inicio, fim) => {
    setPeriod({ inicio, fim, preset: 'custom' })
  }

  return { period, setPreset, setRange }
}
