import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = (id, password) => {
    if (id === 'admin' && password === 'admin') {
      setUser({ id: 'admin', role: 'Admin', name: 'Admin', initials: 'AD' })
      return { ok: true }
    }
    return { ok: false, error: 'Invalid credentials. Check your username and password.' }
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
