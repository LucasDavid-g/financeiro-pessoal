import styles from './ProgressBar.module.css'
export function ProgressBar({ pct, color = 'var(--g400)' }) {
  const safe = Math.min(100, Math.max(0, pct))
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${safe}%`, background: color }} />
    </div>
  )
}
