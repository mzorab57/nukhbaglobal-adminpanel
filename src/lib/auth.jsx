import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, ApiError } from './api'

const AuthContext = createContext(null)
const STORAGE_KEY = 'nukhbaglobal-admin-auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      setIsBootstrapping(false)
      return
    }

    try {
      const parsed = JSON.parse(stored)
      setSession(parsed)
      setUser(parsed.user ?? null)
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setIsBootstrapping(false)
    }
  }, [])

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    let ignore = false

    const syncCurrentUser = async () => {
      try {
        const response = await apiRequest('/api/auth/me', {
          token: session.accessToken,
        })

        if (ignore) {
          return
        }

        const nextSession = {
          ...session,
          user: response.data,
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
        setSession(nextSession)
        setUser(response.data)
      } catch (error) {
        if (ignore) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          window.localStorage.removeItem(STORAGE_KEY)
          setSession(null)
          setUser(null)
        }
      }
    }

    syncCurrentUser()

    return () => {
      ignore = true
    }
  }, [session?.accessToken])

  const value = useMemo(
    () => ({
      user,
      token: session?.accessToken ?? null,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login: async ({ email, password }) => {
        if (!email || !password) {
          throw new Error('Email and password are required.')
        }

        const response = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: {
            email,
            password,
          },
        })

        const nextSession = {
          accessToken: response.data?.access_token ?? null,
          tokenType: response.data?.token_type ?? 'Bearer',
          expiresIn: response.data?.expires_in ?? null,
          user: response.data?.user ?? null,
        }

        if (!nextSession.accessToken || !nextSession.user) {
          throw new Error('Invalid authentication response.')
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
        setSession(nextSession)
        setUser(nextSession.user)
        return nextSession.user
      },
      logout: () => {
        window.localStorage.removeItem(STORAGE_KEY)
        setSession(null)
        setUser(null)
      },
    }),
    [isBootstrapping, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
