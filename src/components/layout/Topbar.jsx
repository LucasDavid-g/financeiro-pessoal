import styles from './Topbar.module.css'

const TAB_LABELS = {
  dashboard:   'Dashboard',
  contas:      'Contas',
  lancamentos: 'Lançar',
  extrato:     'Extrato',
  fixos:       'Fixos',
  metas:       'Metas',
}

export function Topbar({ onToggleTheme, theme, user, onLogout, activeTab }) {
  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <header className={styles.topbar}>
      {/* Brand — mobile only */}
      <div className={styles.brand}>
        <div className={styles.logo}>
          <i className="ti ti-map" />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>Mapa do Bolso</span>
        </div>
      </div>

      {/* Page title — desktop only */}
      <div className={styles.pageTitle}>
        {TAB_LABELS[activeTab] || ''}
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} onClick={onToggleTheme} title="Alternar tema">
          <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
        </button>

        {user && (
          <button className={styles.avatarBtn} onClick={onLogout} title={`Sair (${user.email})`}>
            {user.photo
              ? <img src={user.photo} alt={user.name} className={styles.avatarImg} />
              : <span className={styles.avatarInitials}>{initials}</span>
            }
          </button>
        )}
      </div>
    </header>
  )
}
