import styles from './MetricCard.module.css'

const ACCENT_MAP = { green: 'var(--g400)', red: 'var(--r400)', amber: 'var(--a400)', blue: 'var(--b400)' }

export function MetricCard({ label, value, sub, accent = 'green', valueColor }) {
  return (
    <div className={styles.card} style={{ '--accent': ACCENT_MAP[accent] }}>
      <div className={styles.bar} />
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={{ color: valueColor }}>{value}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
