import styles from './FormGroup.module.css'

export function FormGroup({ label, children, hint }) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}

export function FormRow({ children }) {
  return <div className={styles.row}>{children}</div>
}
