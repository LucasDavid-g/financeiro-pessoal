import { useState, useEffect } from 'react'
import { loginWithGoogle, logoutFirebase, onAuthChange, getCurrentUser } from '../services/firebase.js'

export function useAuth() {
  const [status, setStatus] = useState('loading')
  const [user,   setUser]   = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      if (authUser) {
        setUser({
          uid:   authUser.uid,
          email: authUser.email,
          name:  authUser.displayName,
          photo: authUser.photoURL,
        })
        setStatus('authed')
      } else {
        setUser(null)
        setStatus('unauthed')
      }
    })
    return unsubscribe
  }, [])

  const login = async () => {
    try {
      setStatus('loading')
      await loginWithGoogle()
      setStatus('authed')
    } catch (e) {
      console.error('Login error:', e)
      setStatus('unauthed')
    }
  }

  const logout = async () => {
    try {
      await logoutFirebase()
      setUser(null)
      setStatus('unauthed')
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  return { status, user, login, logout }
}
