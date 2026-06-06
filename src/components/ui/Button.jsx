import styles from './Button.module.css'

export function Button({ children, onClick, variant = 'primary', icon, fullWidth, small, disabled }) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        fullWidth ? styles.full : '',
        small ? styles.small : '',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <i className={`ti ${icon}`} />}
      {children}
    </button>
  )
}
