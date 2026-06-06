import styles from './Nav.module.css'

const TABS = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Início'  },
  { id: 'contas',      icon: 'ti-building-bank',     label: 'Contas'  },
  { id: 'lancamentos', icon: 'ti-plus',               label: 'Lançar'  },
  { id: 'extrato',     icon: 'ti-list-search',        label: 'Extrato' },
  { id: 'fixos',       icon: 'ti-repeat',             label: 'Fixos'   },
  { id: 'metas',       icon: 'ti-target',             label: 'Metas'   },
]

export function Nav({ active, onChange }) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const isCenter = tab.id === 'lancamentos'
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            className={[styles.btn, isActive ? styles.active : '', isCenter ? styles.center : ''].join(' ')}
            onClick={() => onChange(tab.id)}
          >
            {isCenter ? (
              <div className={styles.centerIcon}>
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
