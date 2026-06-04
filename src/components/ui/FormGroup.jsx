import styles from './FormGroup.module.css'

export function FormGroup({ label, children }) {
  return (
    <div className={styles.group}>
      {label && <label className={styles.label}>{label}</label>}
      {children}
    </div>
  )
}

export function FormRow({ children }) {
  return <div className={styles.row}>{children}</div>
}
