import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const ADMIN_SESSION_STORAGE_KEY = 'slep_admin_session_v3'

interface AdminUser {
  email: string
  name: string
  picture: string
}

interface AdminSessionState {
  ok: boolean
  token: string
  user: AdminUser | null
  setSession: (token: string, user: AdminUser) => void
  clearSession: () => void
}

export const useAdminSession = create<AdminSessionState>()(
  persist(
    (set) => ({
      ok: false,
      token: '',
      user: null,
      setSession: (token, user) => set({ ok: true, token, user }),
      clearSession: () => set({ ok: false, token: '', user: null }),
    }),
    {
      name: ADMIN_SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
