import styles from './EmptyState.module.css'

export function EmptyState({ message, icon, action, compact }) {
  return (
    <div className={[styles.empty, compact ? styles.compact : ''].join(' ')}>
      <div className={[styles.iconWrap, compact ? styles.iconCompact : ''].join(' ')}>
        <i className={`ti ${icon || 'ti-inbox'}`} />
      </div>
      <p>{message || 'Nenhum item encontrado'}</p>
      {action}
    </div>
  )
}
