const CLIENT_ID = '738172131282-28pchbstk8vubk6llsh1tf7dvd82278m.apps.googleusercontent.com'
const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets openid email profile'

// Carrega a lib do Google dinamicamente
const loadGoogleScript = () => new Promise((resolve) => {
  if (window.google?.accounts) { resolve(); return }
  const s = document.createElement('script')
  s.src = 'https://accounts.google.com/gsi/client'
  s.onload = resolve
  document.head.appendChild(s)
})

// ── Login via Google Identity Services (Implicit flow) ────────────────────────

export const login = async () => {
  await loadGoogleScript()

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPES,
      callback:  (response) => {
        if (response.error) { reject(response.error); return }
        const expiry = Date.now() + response.expires_in * 1000
        localStorage.setItem('mdb_access_token', response.access_token)
        localStorage.setItem('mdb_token_expiry', expiry)
        resolve(response.access_token)
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

// ── Token ─────────────────────────────────────────────────────────────────────

export const getAccessToken = async () => {
  const token  = localStorage.getItem('mdb_access_token')
  const expiry = parseInt(localStorage.getItem('mdb_token_expiry') || '0')
  if (token && Date.now() < expiry - 60000) return token
  // Token expirado — precisa logar de novo
  return null
}

export const logout = () => {
  localStorage.removeItem('mdb_access_token')
  localStorage.removeItem('mdb_token_expiry')
  localStorage.removeItem('mdb_user')
}

export const isLoggedIn = () => {
  const token  = localStorage.getItem('mdb_access_token')
  const expiry = parseInt(localStorage.getItem('mdb_token_expiry') || '0')
  return !!token && Date.now() < expiry
}

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('mdb_user') || 'null') }
  catch { return null }
}

// handleCallback não é mais necessário mas exporta vazio para não quebrar imports
export const handleCallback = async () => null
