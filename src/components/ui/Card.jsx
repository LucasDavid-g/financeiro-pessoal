import styles from './Card.module.css'

export function Card({ children, style, className, glass, accent }) {
  return (
    <div
      className={[styles.card, glass ? styles.glass : '', className || ''].join(' ')}
      style={{ '--card-accent': accent, ...style }}
    >
      {accent && <div className={styles.accentBar} />}
      {children}
    </div>
  )
}

export function CardHeader({ title, sub, action, icon }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        {icon && <div className={styles.headerIcon}><i className={`ti ${icon}`} /></div>}
        <div>
          <span className={styles.title}>{title}</span>
          {sub && <div className={styles.headerSub}>{sub}</div>}
        </div>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

export function CardDivider() {
  return <div className={styles.divider} />
}
