'use client'
import { create } from 'zustand'
import { api, setAccessToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const data = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password })
      setAccessToken(data.accessToken)
      set({ user: data.user, accessToken: data.accessToken, isLoading: false })
    } catch (e) {
      set({ isLoading: false })
      throw e
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch { /* best effort */ }
    setAccessToken(null)
    set({ user: null, accessToken: null })
  },

  refreshSession: async () => {
    try {
      const data = await api.post<{ accessToken: string; user: User }>('/auth/refresh')
      setAccessToken(data.accessToken)
      set({ user: data.user, accessToken: data.accessToken })
      return true
    } catch {
      set({ user: null, accessToken: null })
      return false
    }
  },
}))
