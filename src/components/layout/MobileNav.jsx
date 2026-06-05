import styles from './MobileNav.module.css'

const TABS = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Início'  },
  { id: 'contas',      icon: 'ti-building-bank',     label: 'Contas'  },
  { id: 'lancamentos', icon: 'ti-plus',               label: 'Lançar'  },
  { id: 'extrato',     icon: 'ti-list-search',        label: 'Extrato' },
  { id: 'fixos',       icon: 'ti-repeat',             label: 'Fixos'   },
]

export function MobileNav({ active, onChange }) {
  return (
    <nav className={styles.nav}>
      {TABS.map(tab => {
        const isLançar = tab.id === 'lancamentos'
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            className={[styles.btn, isActive ? styles.active : '', isLançar ? styles.lançar : ''].join(' ')}
            onClick={() => onChange(tab.id)}
          >
            {isLançar ? (
              <div className={styles.lançarIcon}>
                <i className={`ti ${tab.icon}`} />
              </div>
            ) : (
              <>
                <div className={[styles.iconWrap, isActive ? styles.iconActive : ''].join(' ')}>
                  <i className={`ti ${tab.icon}`} />
                </div>
                <span className={styles.label}>{tab.label}</span>
              </>
            )}
          </button>
        )
      })}
    </nav>
  )
}
