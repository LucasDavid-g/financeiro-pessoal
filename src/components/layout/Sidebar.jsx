import styles from './Sidebar.module.css'

const TABS = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Dashboard'  },
  { id: 'contas',      icon: 'ti-building-bank',     label: 'Contas'     },
  { id: 'lancamentos', icon: 'ti-circle-plus',        label: 'Lançar'     },
  { id: 'extrato',     icon: 'ti-list-search',        label: 'Extrato'    },
  { id: 'fixos',       icon: 'ti-repeat',             label: 'Fixos'      },
  { id: 'metas',       icon: 'ti-target',             label: 'Metas'      },
]

export function Sidebar({ active, onChange, user, onLogout, theme, onToggleTheme }) {
  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <aside className={`app-sidebar ${styles.sidebar}`}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.logo}>
          <i className="ti ti-map" />
        </div>
        <div className={`${styles.brandText} sidebar-brand-text`}>
          <span className={styles.brandName}>Mapa do Bolso</span>
          <span className={styles.brandSub}>controle financeiro</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={`${styles.sectionTitle} sidebar-section-title`}>Menu</div>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={[styles.navItem, active === tab.id ? styles.navActive : ''].join(' ')}
            onClick={() => onChange(tab.id)}
            title={tab.label}
          >
            <div className={styles.navIcon}>
              <i className={`ti ${tab.icon}`} />
            </div>
            <span className={`${styles.navLabel} sidebar-label`}>{tab.label}</span>
            {active === tab.id && <div className={styles.activeBar} />}
          </button>
        ))}
      </nav>

      {/* Footer — apenas theme + user */}
      <div className={styles.footer}>
        <div className={styles.footerActions}>
          <button className={styles.themeBtn} onClick={onToggleTheme} title="Alternar tema">
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>

          {user && (
            <button className={styles.userBtn} onClick={onLogout} title={`Sair (${user.email})`}>
              {user.photo
                ? <img src={user.photo} alt={user.name} className={styles.avatar} />
                : <span className={styles.avatarInitials}>{initials}</span>
              }
              <span className={`${styles.userName} sidebar-user-name`}>{user.name?.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
