import { useState } from 'react'

export function useMonthNav() {
  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())

  const setMonth = (year, month) => {
    setSelYear(year)
    setSelMonth(month)
  }

  const prev = () => {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11) }
    else setSelMonth(m => m - 1)
  }

  const next = () => {
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0) }
    else setSelMonth(m => m + 1)
  }

  return { selYear, selMonth, setMonth, prev, next }
}
