import styles from './ProgressBar.module.css'

export function ProgressBar({ pct, color }) {
  return (
    <div className={styles.track}>
      <div className={styles.fill} style={{ width: `${Math.min(100, pct)}%`, background: color || 'var(--g400)' }} />
    </div>
  )
}
