import styles from './Badge.module.css'
export function Badge({ children, variant = 'g' }) {
  return <span className={[styles.badge, styles[variant]].join(' ')}>{children}</span>
}
