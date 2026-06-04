import { MONTHS_FULL } from '../../data/defaults.js'
import styles from './Topbar.module.css'

export function Topbar({ selYear, selMonth, onChangeMonth, onToggleTheme, theme, user, onLogout }) {
  const monthOptions = []
  const now = new Date()
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    for (let m = 0; m < 12; m++) {
      monthOptions.push({ value: `${y}-${m}`, label: `${MONTHS_FULL[m]} ${y}` })
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <div className={styles.logo}><i className="ti ti-map" /></div>
        <div>
          <div className={styles.title}>Mapa do Bolso</div>
          <div className={styles.sub}>controle financeiro pessoal</div>
        </div>
      </div>
      <div className={styles.actions}>
        <select
          className={styles.monthSelect}
          value={`${selYear}-${selMonth}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number)
            onChangeMonth(y, m)
          }}
        >
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className={styles.themeBtn} onClick={onToggleTheme} title="Alternar tema">
          <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
        </button>
        {user && (
          <button className={styles.themeBtn} onClick={onLogout} title={`Sair (${user.email})`}>
            <i className="ti ti-logout" />
          </button>
        )}
      </div>
    </header>
  )
}
