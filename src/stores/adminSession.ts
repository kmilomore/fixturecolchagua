import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const ADMIN_SESSION_STORAGE_KEY = 'slep_admin_session_v3'
const ADMIN_SESSION_MAX_AGE_MS = 60 * 60 * 1000

interface AdminUser {
  email: string
  name: string
  picture: string
}

export interface AdminSessionState {
  ok: boolean
  token: string
  user: AdminUser | null
  expiresAt: number
  setSession: (token: string, user: AdminUser) => void
  clearSession: () => void
}

function createLoggedOutState(): Pick<AdminSessionState, 'ok' | 'token' | 'user' | 'expiresAt'> {
  return { ok: false, token: '', user: null, expiresAt: 0 }
}

export function isAdminSessionActive(session: Pick<AdminSessionState, 'ok' | 'expiresAt'>) {
  return session.ok && session.expiresAt > Date.now()
}

export const useAdminSession = create<AdminSessionState>()(
  persist(
    (set) => ({
      ...createLoggedOutState(),
      setSession: (token, user) =>
        set({
          ok: true,
          token,
          user,
          expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE_MS,
        }),
      clearSession: () => set(createLoggedOutState()),
    }),
    {
      name: ADMIN_SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as Partial<AdminSessionState>) }
        return isAdminSessionActive(merged) ? merged : { ...currentState, ...createLoggedOutState() }
      },
    },
  ),
)
