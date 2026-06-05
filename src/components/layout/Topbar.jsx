import { MONTHS_FULL } from '../../data/defaults.js'
import styles from './Topbar.module.css'

const TAB_LABELS = {
  dashboard:   'Dashboard',
  contas:      'Contas',
  lancamentos: 'Lançar',
  extrato:     'Extrato',
  fixos:       'Fixos',
  metas:       'Metas',
}

export function Topbar({ selYear, selMonth, onChangeMonth, onToggleTheme, theme, user, onLogout, activeTab }) {
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
