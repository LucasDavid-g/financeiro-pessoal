import styles from './Card.module.css'

export function Card({ children, style }) {
  return <div className={styles.card} style={style}>{children}</div>
}

export function CardHeader({ title, action }) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>{title}</span>
      {action}
    </div>
  )
}
