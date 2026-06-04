import styles from './Nav.module.css'

const TABS = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Início'   },
  { id: 'insights',    icon: 'ti-chart-bar',         label: 'Insights' },
  { id: 'contas',      icon: 'ti-building-bank',     label: 'Contas'   },
  { id: 'lancamentos', icon: 'ti-receipt',            label: 'Lançar'   },
  { id: 'extrato',     icon: 'ti-list-search',        label: 'Extrato'  },
  { id: 'fixos',       icon: 'ti-repeat',             label: 'Fixos'    },
  { id: 'metas',       icon: 'ti-target',             label: 'Metas'    },
]

export function Nav({ active, onChange }) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={[styles.btn, active === tab.id ? styles.active : ''].join(' ')}
          onClick={() => onChange(tab.id)}
        >
          <i className={`ti ${tab.icon}`} />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
