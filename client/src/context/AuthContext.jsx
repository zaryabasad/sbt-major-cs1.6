import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'sbt-major-admin-session'
const ADMIN_CREDENTIALS = { username: 'admin', password: 'major123' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY)
    return savedUser ? JSON.parse(savedUser) : null
  })

  const login = (username, password) => {
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) return false
    const adminUser = { username }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser))
    setUser(adminUser)
    return true
  }

  const logout = () => { localStorage.removeItem(STORAGE_KEY); setUser(null) }
  const value = useMemo(() => ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
