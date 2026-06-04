import { useState } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import { Topbar }      from './components/layout/Topbar.jsx'
import { Nav }         from './components/layout/Nav.jsx'
import { Dashboard }   from './components/sections/Dashboard.jsx'
import { Insights }    from './components/sections/Insights.jsx'
import { Contas }      from './components/sections/Contas.jsx'
import { Lancamentos } from './components/sections/Lancamentos.jsx'
import { Extrato }     from './components/sections/Extrato.jsx'
import { Fixos }       from './components/sections/Fixos.jsx'
import { Metas }       from './components/sections/Metas.jsx'
import { Login }       from './components/sections/Login.jsx'
import { useMonthNav } from './hooks/useMonthNav.js'
import { useTheme }    from './hooks/useTheme.js'
import { useAuth }     from './hooks/useAuth.js'
import './styles/globals.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { selYear, selMonth, setMonth } = useMonthNav()
  const { theme, toggle } = useTheme()
  const { status, user, login, logout } = useAuth()

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--g400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', margin: '0 auto 1rem' }}>
            <i className="ti ti-map" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>carregando...</div>
        </div>
      </div>
    )
  }

  if (status === 'unauthed') return <Login onLogin={login} />

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
        user={user}
        onLogout={logout}
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
