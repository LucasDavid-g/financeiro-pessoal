import { MONTHS_FULL } from '../../data/defaults.js'
import styles from './Sidebar.module.css'

const TABS = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Dashboard'  },
  { id: 'contas',      icon: 'ti-building-bank',     label: 'Contas'     },
  { id: 'lancamentos', icon: 'ti-plus-circle',        label: 'Lançar'     },
  { id: 'extrato',     icon: 'ti-list-search',        label: 'Extrato'    },
  { id: 'fixos',       icon: 'ti-repeat',             label: 'Fixos'      },
  { id: 'metas',       icon: 'ti-target',             label: 'Metas'      },
]

export function Sidebar({ active, onChange, user, onLogout, theme, onToggleTheme, selYear, selMonth, onChangeMonth }) {
  const now = new Date()
  const monthOptions = []
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    for (let m = 0; m < 12; m++) {
      monthOptions.push({ value: `${y}-${m}`, label: `${MONTHS_FULL[m]} ${y}` })
    }
  }

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

      {/* Footer */}
      <div className={styles.footer}>
        {/* Month selector */}
        <div className={`${styles.monthWrap} sidebar-month`}>
          <div className={styles.monthLabel}>Período</div>
          <select
            className={styles.monthSelect}
            value={`${selYear}-${selMonth}`}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number)
              onChangeMonth(y, m)
            }}
          >
            {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

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
