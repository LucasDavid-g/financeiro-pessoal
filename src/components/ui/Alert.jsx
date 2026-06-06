import styles from './Alert.module.css'

const ICONS = { danger: 'ti-alert-triangle', warn: 'ti-alert-circle', ok: 'ti-check', info: 'ti-info-circle' }

export function Alert({ children, variant = 'info' }) {
  return (
    <div className={[styles.alert, styles[variant]].join(' ')}>
      <i className={`ti ${ICONS[variant] || ICONS.info}`} />
      <span>{children}</span>
    </div>
  )
}
