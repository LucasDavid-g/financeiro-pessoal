import { useState, useRef, useEffect } from 'react'
import { PRESETS, getPresetRange, periodLabel } from '../../hooks/usePeriod.js'
import { useIsMobile } from '../../hooks/useIsMobile.js'
import styles from './PeriodFilter.module.css'

export function PeriodFilter({ period, onPreset, onRange, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isMobile = useIsMobile(768)

  // Fechar ao clicar fora — touchstart é necessário porque em mobile os
  // toques disparam touchstart antes de mousedown (o dropdown abria e
  // fechava imediatamente sem o listener de touch).
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const handlePreset = (id) => {
    onPreset(id)
    if (id !== 'custom') setOpen(false)
  }

  const handleRangeChange = (field, val) => {
    const next = { ...period, [field]: val, preset: 'custom' }
    onRange(next.inicio, next.fim)
  }

  const label = periodLabel(period)

  return (
    <div className={styles.wrap} ref={ref}>
      {/* Pill trigger */}
      <button className={styles.pill} onClick={() => setOpen(o => !o)}>
        <i className="ti ti-calendar-stats" />
        <span className={styles.pillLabel}>{label}</span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'} ${styles.pillArrow}`} />
      </button>

      {/* Overlay mobile — fecha o bottom sheet ao tocar fora */}
      {open && isMobile && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 499
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className={[styles.dropdown, align === 'right' ? styles.dropdownRight : ''].join(' ')}>
          {/* Presets */}
          <div className={styles.presets}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                className={[styles.preset, period.preset === p.id ? styles.presetActive : ''].join(' ')}
                onClick={() => handlePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date inputs — sempre visíveis (destacados quando custom) */}
          <div className={styles.dateSection}>
            <div className={styles.dateSectionTitle}>Intervalo de datas</div>
            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>De</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={period.inicio}
                  onChange={e => handleRangeChange('inicio', e.target.value)}
                />
              </div>
              <div className={styles.dateSep}>
                <i className="ti ti-arrow-right" />
              </div>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Até</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={period.fim}
                  onChange={e => handleRangeChange('fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer com período ativo */}
          <div className={styles.dropdownFooter}>
            <span className={styles.footerLabel}>
              <i className="ti ti-check" />
              {label}
            </span>
            <button className={styles.applyBtn} onClick={() => setOpen(false)}>
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
