'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getGames, getGameCards, selectCard, releaseCardApi, authTelegram, getProfile } from '@/lib/api'
import { getStoredToken, getStoredUser, storeAuth, clearAuth } from '@/lib/auth'
import { connectSocket, disconnectSocket, getSocket, joinGameRoom, leaveGameRoom } from '@/lib/socket'
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
  const [selectionCountdown, setSelectionCountdown] = useState<number | null>(null)

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
    if (selectionCountdown === null || selectionCountdown <= 0) return
    const timer = setInterval(() => {
      setSelectionCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [selectionCountdown])

  useEffect(() => {
    if (!game) return
    try { joinGameRoom(game._id) } catch {}
    return () => {
      try { leaveGameRoom(game._id) } catch {}
    }
  }, [game])

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

    sock.on('game:countdown', (data: unknown) => {
      const d = data as { gameId: string; phase?: string }
      if (d.phase === 'selection') {
        setSelectionCountdown((data as { seconds: number }).seconds ?? 30)
        fetchGame()
      } else {
        goToGame(data)
      }
    })
    sock.on('game:started', goToGame)
    sock.on('game:winner', refresh)
    sock.on('game:cancelled', refresh)

    sock.on('game:sync', (data: unknown) => {
      const d = data as { gameId: string; status: string; countdownRemaining?: number; phase?: string }
      if (d.phase === 'selection' && d.countdownRemaining !== undefined) {
        setSelectionCountdown(Math.ceil(d.countdownRemaining))
      } else if (d.status !== 'selection') {
        setSelectionCountdown(null)
      }
    })

    sock.on('card:purchased', (data: unknown) => {
      const d = data as { cardId: string; userId: string }
      setCards((prev) => prev.map((c) =>
        c._id === d.cardId
          ? { ...c, status: 'purchased', isOwnedByMe: d.userId === user?._id }
          : c
      ))
      refreshWithUser()
    })

    sock.on('card:released', (data: unknown) => {
      const d = data as { cardId: string }
      setCards((prev) => prev.map((c) =>
        c._id === d.cardId
          ? { ...c, status: 'available', isOwnedByMe: false }
          : c
      ))
      refreshWithUser()
    })

    return () => {
      sock.off('game:countdown')
      sock.off('game:started', goToGame)
      sock.off('game:winner', refresh)
      sock.off('game:cancelled', refresh)
      sock.off('game:sync')
      sock.off('card:purchased')
      sock.off('card:released')
    }
  }, [fetchGame, refreshUser, router, user])

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
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)' }}>
        <div className="text-center animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-purple-200">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Ato Bingo</h1>
          <p className="text-purple-400 font-medium">
            {error || 'Initializing...'}
          </p>
          {error && (
            <button
              onClick={() => { setError(''); setLoading(true); window.location.reload() }}
              className="btn-primary mt-6"
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
    <div className="pb-24">
      <div className="p-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Ato Bingo</h1>
              <p className="text-sm text-gray-400">Hi, {user.firstName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 font-medium">Balance</div>
            <div className="text-xl font-extrabold text-purple-600">
              {user.balance.toFixed(2)} Br
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-16" />
            <div className="skeleton h-72" />
          </div>
        ) : !game ? (
          <div className="text-center py-16 bg-white/60 rounded-2xl border border-gray-100">
            <div className="text-5xl mb-4">🎲</div>
            <p className="text-gray-400 font-semibold">No game available right now</p>
            <p className="text-sm text-gray-300 mt-1">Check back soon</p>
          </div>
        ) : isSelection ? (
          canAfford ? (
            <div>
              {/* Selection countdown banner */}
              {selectionCountdown !== null && selectionCountdown > 0 && (
                <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 mb-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-3xl font-extrabold text-amber-600">{selectionCountdown}s</div>
                    <div className="text-left">
                      <div className="font-bold text-amber-700 text-sm">Card Selection Ending Soon!</div>
                      <div className="text-xs text-amber-500">Buy your cards before time runs out</div>
                    </div>
                  </div>
                  <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(selectionCountdown / 30) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Game info bar */}
              <div className="rounded-2xl p-4 bg-white border border-gray-100 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-purple-200">
                    #{game.gameCode}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">Game #{game.gameCode}</span>
                    <span className="ml-2 badge-primary text-[10px]">{game.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-amber-500">{Math.floor(game.prizePool * 0.8)} Br</span>
                  <span className="text-gray-300">prize</span>
                </div>
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
            <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="font-extrabold text-gray-900 mb-1">Insufficient Balance</h3>
              <p className="text-sm text-gray-400 mb-5">
                You need at least {cardPrice} Birr to buy a card
              </p>
              <button
                onClick={() => router.push('/wallet')}
                className="btn-accent w-full"
              >
                Deposit Now
              </button>
            </div>
          )
        ) : (
          <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center">
            <div className="text-sm text-gray-400 mb-3">
              Game #{game.gameCode} is <span className="font-semibold text-purple-500">{game.status}</span>
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
