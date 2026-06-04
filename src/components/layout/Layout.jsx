import { useApp } from '../../store/AppContext'
import { MONTH_FULL } from '../../utils/constants'

const TABS = [
  { id: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Início'   },
  { id: 'insights',    icon: 'ti-chart-bar',         label: 'Insights' },
  { id: 'contas',      icon: 'ti-building-bank',     label: 'Contas'   },
  { id: 'lancamentos', icon: 'ti-receipt',            label: 'Lançar'   },
  { id: 'extrato',     icon: 'ti-list-search',        label: 'Extrato'  },
  { id: 'fixos',       icon: 'ti-repeat',             label: 'Fixos'    },
  { id: 'metas',       icon: 'ti-target',             label: 'Metas'    },
]

export function Topbar({ activeTab, setActiveTab }) {
  const { selYear, selMonth, setSelYear, setSelMonth } = useApp()
  const now = new Date()

  const handleMonth = (e) => {
    const [y, m] = e.target.value.split('-').map(Number)
    setSelYear(y); setSelMonth(m)
  }

  const monthValue = `${selYear}-${selMonth}`

  const options = []
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
    for (let m = 0; m < 12; m++) {
      options.push(
        <option key={`${y}-${m}`} value={`${y}-${m}`}>
          {MONTH_FULL[m]} {y}
        </option>
      )
    }
  }

  return (
    <div className="flex items-center gap-3 pb-5 border-b border-[var(--color-border)] mb-5">
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 cursor-pointer"
        style={{ background: '#1D9E75' }}
        onClick={() => setActiveTab('dashboard')}
      >
        <i className="ti ti-map text-white text-lg" />
      </div>
      <div>
        <div className="text-[16px] font-medium tracking-[-0.3px]">Mapa do Bolso</div>
        <div className="text-[12px] text-[var(--color-text3)] font-mono mt-0.5">
          {MONTH_FULL[selMonth].toLowerCase().slice(0,3)}/{selYear}
        </div>
      </div>
      <div className="ml-auto">
        <select
          value={monthValue}
          onChange={handleMonth}
          className="text-[13px] rounded-full px-3 py-1.5 cursor-pointer"
        >
          {options}
        </select>
      </div>
    </div>
  )
}

export function Navbar({ activeTab, setActiveTab }) {
  return (
    <div className="grid grid-cols-7 gap-0.5 bg-[var(--color-bg2)] rounded-xl p-0.5 mb-6">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded-[10px] text-[9px] font-[DM_Sans] cursor-pointer transition-all border-none
            ${activeTab === tab.id
              ? 'bg-[var(--color-bg)] text-[var(--color-text)] font-medium shadow-sm'
              : 'bg-transparent text-[var(--color-text3)]'
            }`}
        >
          <i className={`ti ${tab.icon} text-[15px]`} />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Layout({ children, activeTab, setActiveTab }) {
  return (
    <div className="font-[DM_Sans] max-w-[480px] mx-auto px-4 py-2 pb-8">
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      {children}
    </div>
  )
}
