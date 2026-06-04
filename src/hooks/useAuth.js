import { useState, useEffect } from 'react'
import { isLoggedIn, logout as authLogout, getUser, login as authLogin } from '../services/auth.js'
import { setupSheets } from '../services/sheets.js'

export function useAuth() {
  const [status, setStatus] = useState('loading')
  const [user,   setUser]   = useState(null)

  useEffect(() => {
    const init = async () => {
      if (isLoggedIn()) {
        setUser(getUser())
        try { await setupSheets() } catch {}
        setStatus('authed')
        return
      }
      setStatus('unauthed')
    }
    init()
  }, [])

  const login = async () => {
    try {
      setStatus('loading')
      const token = await authLogin()
      // Busca info do usuário
      const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const info = await res.json()
      localStorage.setItem('mdb_user', JSON.stringify(info))
      setUser(info)
      await setupSheets()
      setStatus('authed')
    } catch (e) {
      console.error('Login error:', e)
      setStatus('unauthed')
    }
  }

  const logout = () => {
    authLogout()
    setUser(null)
    setStatus('unauthed')
  }

  return { status, user, login, logout }
}
