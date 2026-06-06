import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, ref, set, get, remove } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCyDBmIbjpP4LwUOQfhFN8UzPaXic99BNA',
  authDomain: 'financeiro-pessoal-84ade.firebaseapp.com',
  databaseURL: 'https://financeiro-pessoal-84ade-default-rtdb.firebaseio.com',
  projectId: 'financeiro-pessoal-84ade',
  storageBucket: 'financeiro-pessoal-84ade.firebasestorage.app',
  messagingSenderId: '534998724976',
  appId: '1:534998724976:web:425f8af993182068ae1fb5',
}

const app      = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getDatabase(app)

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'consent' })

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginWithGoogle = () => signInWithPopup(auth, provider)

export const logoutFirebase = () => signOut(auth)

export const onAuthChange = (cb) => onAuthStateChanged(auth, cb)

export const getCurrentUser = () => auth.currentUser

// ── Database ──────────────────────────────────────────────────────────────────

const userDataRef = (uid) => ref(db, `users/${uid}/data`)

export const saveUserData = async (uid, data) => {
  await set(userDataRef(uid), data)
}

export const loadUserData = async (uid) => {
  const snap = await get(userDataRef(uid))
  return snap.exists() ? snap.val() : null
}

export const clearUserData = async (uid) => {
  await remove(userDataRef(uid))
}
