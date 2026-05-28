'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getGames, getGameCards, selectCard, releaseCardApi, authTelegram, getProfile } from '@/lib/api'
import { getStoredToken, getStoredUser, storeAuth, clearAuth } from '@/lib/auth'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import NavBar from '@/components/NavBar'
import CardSelector from '@/components/CardSelector'
import type { User, Game, BingoCard } from '@/types'

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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [cards, setCards] = useState<BingoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const tryRestoreSession = useCallback(async () => {
    const storedUser = getStoredUser()
    const token = getStoredToken()
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user

    if (token && storedUser && tgUser) {
      const currentTgId = String(tgUser.id)
      if (String(storedUser.telegramId) !== currentTgId) {
        clearAuth()
        return false
      }
    }

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

  const fetchGame = useCallback(async () => {
    try {
      const games = await getGames()
      const g = games[0]
      if (!g) {
        setLoading(false)
        return
      }
      setGame(g)
      if (g.status === 'starting' || g.status === 'active') {
        router.push(`/games/${g._id}`)
        return
      }
      if (g.status === 'selection') {
        const allCards = await getGameCards(g._id)
        setCards(allCards)
      }
    } catch {
      setError('Failed to load game')
    } finally {
      setLoading(false)
    }
  }, [router])

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await getProfile()
      setUser(fresh)
      const token = getStoredToken()
      if (token) storeAuth(token, fresh)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchGame()
  }, [user, fetchGame])

  useEffect(() => {
    let sock: ReturnType<typeof getSocket>
    try {
      sock = getSocket()
    } catch {
      return
    }

    const refresh = () => { fetchGame() }
    const refreshWithUser = () => { fetchGame(); refreshUser() }
    const goToGame = (data: unknown) => {
      const d = data as { gameId: string }
      router.push(`/games/${d.gameId}`)
    }

    sock.on('game:countdown', goToGame)
    sock.on('game:started', goToGame)
    sock.on('game:winner', refresh)
    sock.on('game:cancelled', refresh)
    sock.on('card:purchased', refreshWithUser)
    sock.on('card:released', refreshWithUser)

    return () => {
      sock.off('game:countdown', goToGame)
      sock.off('game:started', goToGame)
      sock.off('game:winner', refresh)
      sock.off('game:cancelled', refresh)
      sock.off('card:purchased', refreshWithUser)
      sock.off('card:released', refreshWithUser)
    }
  }, [fetchGame, refreshUser, router])

  const handleSelect = async (card: BingoCard) => {
    if (!game) return
    setActionLoading(true)
    setError('')
    try {
      const result = await selectCard(game._id, card._id)
      if (result.card) {
        setCards((prev) => prev.map((c) =>
          c._id === card._id ? { ...c, ...result.card, status: 'purchased' } : c
        ))
      }
      const [allCards, fresh] = await Promise.all([getGameCards(game._id), getProfile()])
      setCards(allCards)
      setUser(fresh)
      const token = getStoredToken()
      if (token) storeAuth(token, fresh)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to purchase card')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRelease = async (card: BingoCard) => {
    if (!game) return
    setActionLoading(true)
    setError('')
    try {
      await releaseCardApi(game._id, card._id)
      const [allCards, fresh] = await Promise.all([getGameCards(game._id), getProfile()])
      setCards(allCards)
      setUser(fresh)
      const token = getStoredToken()
      if (token) storeAuth(token, fresh)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to release card')
    } finally {
      setActionLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Bingo</h1>
          <p style={{ color: '#c39977' }}>
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

  const cardPrice = game?.cardPrice ?? 10
  const canAfford = user.balance >= cardPrice
  const isSelection = game?.status === 'selection'
  const myCards = cards.filter(c => c.isOwnedByMe)

  return (
    <div className="pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Bingo</h1>
            <p style={{ color: '#c39977' }}>
              Welcome, {user.firstName}
            </p>
          </div>
          <div className="text-right">
            <div style={{ color: '#c39977' }}>Balance</div>
            <div className="text-xl font-bold" style={{ color: '#0ca3db' }}>
              {user.balance.toFixed(2)} Birr
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="card animate-pulse h-20" />
            <div className="card animate-pulse h-64" />
          </div>
        ) : !game ? (
          <div className="text-center py-12" style={{ color: '#c39977' }}>
            <p>No game available right now</p>
            <p className="text-sm mt-1">Check back soon</p>
          </div>
        ) : isSelection ? (
          canAfford ? (
            <div>
              <div className="card mb-3 flex justify-between items-center py-2 px-3">
                <span className="font-semibold">Game #{game.gameCode}</span>
                <span style={{ color: '#0ca3db' }} className="font-bold">Prize {Math.floor(game.prizePool * 0.8)} Birr</span>
                <span>{myCards.length} mine</span>
              </div>
              <CardSelector
                cards={cards}
                cardPrice={cardPrice}
                onSelect={handleSelect}
                onRelease={handleRelease}
                loading={actionLoading}
              />
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-bold mb-1">Insufficient Balance</h3>
              <p className="mb-4" style={{ color: '#c39977' }}>
                You need at least {cardPrice} Birr to buy a card
              </p>
              <button
                onClick={() => router.push('/wallet')}
                className="btn-primary"
              >
                Deposit Now
              </button>
            </div>
          )
        ) : (
          <div className="card text-center py-8">
            <div className="mb-2" style={{ color: '#c39977' }}>
              Game #{game.gameCode} is <strong>{game.status}</strong>
            </div>
            <button
              onClick={() => router.push(`/games/${game._id}`)}
              className="btn-primary"
            >
              View Game
            </button>
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
