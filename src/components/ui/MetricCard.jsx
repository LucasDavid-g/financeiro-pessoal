import styles from './MetricCard.module.css'

const ACCENT_MAP = {
  green: { color: 'var(--g400)', bg: 'var(--g50)', darkBg: 'rgba(16,185,129,0.1)', icon: 'ti-trending-up' },
  red:   { color: 'var(--r400)', bg: 'var(--r50)', darkBg: 'rgba(244,63,94,0.1)',  icon: 'ti-trending-down' },
  amber: { color: 'var(--a400)', bg: 'var(--a50)', darkBg: 'rgba(245,158,11,0.1)', icon: 'ti-coin' },
  blue:  { color: 'var(--b400)', bg: 'var(--b50)', darkBg: 'rgba(59,130,246,0.1)', icon: 'ti-chart-bar' },
}

export function MetricCard({ label, value, sub, accent = 'green', valueColor, icon, trend, trendValue, trendLabel, fullWidth }) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.green
  const trendPositive = trend === 'up'
  const trendIcon = trendPositive ? 'ti-arrow-up-right' : 'ti-arrow-down-right'
  const trendColor = trendPositive ? 'var(--g400)' : 'var(--r400)'

  return (
    <div className={[styles.card, fullWidth ? styles.full : ''].join(' ')} style={{ '--accent': a.color, '--accent-bg': a.bg }}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && (
          <div className={styles.iconWrap} style={{ background: a.bg, color: a.color }}>
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className={styles.value} style={{ color: valueColor || a.color }}>{value}</div>
      <div className={styles.bottom}>
        {sub && <span className={styles.sub}>{sub}</span>}
        {trend && trendValue && (
          <span className={styles.trend} style={{ color: trendColor }}>
            <i className={`ti ${trendIcon}`} />
            {trendValue} {trendLabel || ''}
          </span>
        )}
      </div>
    </div>
  )
}
