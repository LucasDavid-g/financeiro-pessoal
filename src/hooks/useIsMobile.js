import { useState, useEffect } from 'react'

// Hook leve para alternar comportamento (não apenas estilo) abaixo de um breakpoint.
// Usado, por ex., para trocar o formato de valores monetários nos statChips do
// Dashboard em telas estreitas, onde "R$ 999.999,99" não cabe ao lado do label.
export function useIsMobile(breakpoint = 480) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
