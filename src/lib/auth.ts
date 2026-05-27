import type { User } from '@/types'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const INIT_DATA_KEY = 'initData'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function getStoredInitData(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(INIT_DATA_KEY)
}

export function storeAuth(token: string, user: User, initData?: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (initData) localStorage.setItem(INIT_DATA_KEY, initData)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(INIT_DATA_KEY)
}

/**
 * Check if the cached user matches the current Telegram WebApp user.
 * If not, clear the stale session so a fresh auth is forced.
 * Returns true if the session is still valid.
 */
export function validateTelegramSession(): boolean {
  if (typeof window === 'undefined') return false
  const storedUser = getStoredUser()
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  if (storedUser && tgUser && String(storedUser.telegramId) !== String(tgUser.id)) {
    clearAuth()
    return false
  }
  return !!getStoredToken()
}

export function isAuthenticated(): boolean {
  return !!getStoredToken() || !!getStoredInitData()
}
