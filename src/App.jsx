import { useState } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import { Topbar } from './components/layout/Topbar.jsx'
import { Nav } from './components/layout/Nav.jsx'
import { Dashboard }    from './components/sections/Dashboard.jsx'
import { Insights }     from './components/sections/Insights.jsx'
import { Contas }       from './components/sections/Contas.jsx'
import { Lancamentos }  from './components/sections/Lancamentos.jsx'
import { Extrato }      from './components/sections/Extrato.jsx'
import { Fixos }        from './components/sections/Fixos.jsx'
import { Metas }        from './components/sections/Metas.jsx'
import { useMonthNav }  from './hooks/useMonthNav.js'
import { useTheme }     from './hooks/useTheme.js'
import './styles/globals.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { selYear, selMonth, setMonth } = useMonthNav()
  const { theme, toggle } = useTheme()

  const sections = {
    dashboard:   <Dashboard   selYear={selYear} selMonth={selMonth} />,
    insights:    <Insights    selYear={selYear} selMonth={selMonth} />,
    contas:      <Contas      selYear={selYear} selMonth={selMonth} />,
    lancamentos: <Lancamentos />,
    extrato:     <Extrato     selYear={selYear} selMonth={selMonth} />,
    fixos:       <Fixos />,
    metas:       <Metas />,
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Topbar
        selYear={selYear}
        selMonth={selMonth}
        onChangeMonth={setMonth}
        onToggleTheme={toggle}
        theme={theme}
      />
      <Nav active={activeTab} onChange={setActiveTab} />
      <main style={{ flex: 1, paddingBottom: '2rem' }}>
        {sections[activeTab]}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
