import { useState } from 'react'
import { AppProvider } from './context/AppContext.jsx'
import { Sidebar }     from './components/layout/Sidebar.jsx'
import { Topbar }      from './components/layout/Topbar.jsx'
import { MobileNav }   from './components/layout/MobileNav.jsx'
import { Dashboard }   from './components/sections/Dashboard.jsx'
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
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--color-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--gradient-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', margin: '0 auto 1rem',
            boxShadow: '0 8px 24px var(--g-glow)',
          }}>
            <i className="ti ti-map" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text3)', fontFamily: 'var(--font-mono)' }}>
            carregando...
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthed') return <Login onLogin={login} />

  const sharedProps = { selYear, selMonth }

  const sections = {
    dashboard:   <Dashboard   {...sharedProps} />,
    contas:      <Contas      {...sharedProps} />,
    lancamentos: <Lancamentos />,
    extrato:     <Extrato     {...sharedProps} />,
    fixos:       <Fixos />,
    metas:       <Metas />,
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={activeTab}
        onChange={setActiveTab}
        user={user}
        onLogout={logout}
        theme={theme}
        onToggleTheme={toggle}
        selYear={selYear}
        selMonth={selMonth}
        onChangeMonth={setMonth}
      />

      <div className="app-body">
        <Topbar
          selYear={selYear}
          selMonth={selMonth}
          onChangeMonth={setMonth}
          onToggleTheme={toggle}
          theme={theme}
          user={user}
          onLogout={logout}
          activeTab={activeTab}
        />

        <main className="app-main section-wrap">
          {sections[activeTab]}
        </main>

        <MobileNav active={activeTab} onChange={setActiveTab} />
      </div>
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
