import styles from './Alert.module.css'

const VARIANTS = {
  ok:     { cls: styles.ok,     icon: 'ti-circle-check'   },
  warn:   { cls: styles.warn,   icon: 'ti-alert-triangle' },
  danger: { cls: styles.danger, icon: 'ti-alert-circle'   },
  info:   { cls: styles.info,   icon: 'ti-info-circle'    },
}

export function Alert({ variant = 'info', children }) {
  const { cls, icon } = VARIANTS[variant]
  return (
    <div className={[styles.alert, cls].join(' ')}>
      <i className={`ti ${icon}`} />
      {children}
    </div>
  )
}
