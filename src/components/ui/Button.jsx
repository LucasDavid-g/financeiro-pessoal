import styles from './Button.module.css'

export function Button({ children, variant = 'ghost', onClick, type = 'button', fullWidth, icon }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={[styles.btn, styles[variant], fullWidth ? styles.full : ''].join(' ')}
    >
      {icon && <i className={`ti ${icon}`} />}
      {children}
    </button>
  )
}
