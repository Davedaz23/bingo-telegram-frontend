'use client'

import { useState, useEffect, useCallback } from 'react'
import { getGames, getProfile, authTelegram } from '@/lib/api'
import { getStoredToken, getStoredUser, storeAuth, clearAuth } from '@/lib/auth'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import NavBar from '@/components/NavBar'
import GameListItem from '@/components/GameListItem'
import type { User, Game } from '@/types'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
          }
        }
        ready: () => void
        expand: () => void
      }
    }
  }
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tryRestoreSession = useCallback(async () => {
    const storedUser = getStoredUser()
    const token = getStoredToken()
    if (token && storedUser) {
      try {
        const fresh = await getProfile()
        setUser(fresh)
        storeAuth(token, fresh)
        connectSocket(token)
        return true
      } catch {
        clearAuth()
        return false
      }
    }
    return false
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const tg = window.Telegram?.WebApp
        if (tg) {
          tg.ready()
          tg.expand()
        }

        const restored = await tryRestoreSession()
        if (restored) return

        const initData = tg?.initData
        if (initData) {
          const result = await authTelegram(initData)
          if (cancelled) return
          storeAuth(result.token, result.user, initData)
          setUser(result.user)
          connectSocket(result.token)
          return
        }

        setError('Not available in Telegram Mini App')
        setLoading(false)
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Authentication failed')
          clearAuth()
          setLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [tryRestoreSession])

  useEffect(() => {
    if (!user) return

    const fetchGames = async () => {
      try {
        const data = await getGames()
        setGames(data)
      } catch {
        setError('Failed to load games')
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
    const interval = setInterval(fetchGames, 10000)
    return () => {
      clearInterval(interval)
      disconnectSocket()
    }
  }, [user])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🎱</div>
          <h1 className="text-xl font-bold mb-2">Bingo</h1>
          <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {error || 'Initializing...'}
          </p>
          {error && (
            <button
              onClick={() => { setError(''); setLoading(true); window.location.reload() }}
              className="btn-primary mt-4"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-16">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Bingo</h1>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Welcome, {user.firstName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>Balance</div>
            <div className="text-lg font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
              ${user.balance.toFixed(2)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse h-20" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--tg-theme-hint-color)' }}>
            <div className="text-3xl mb-2">🎮</div>
            <p>No active games right now</p>
            <p className="text-xs mt-1">Check back soon or wait for an admin to create one</p>
          </div>
        ) : (
          <div>
            <h2 className="font-bold mb-3">Active Games</h2>
            {games.map((game) => (
              <GameListItem key={game._id} game={game} />
            ))}
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
