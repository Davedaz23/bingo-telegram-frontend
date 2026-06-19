// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getGames, getGameCards, selectCard, purchaseCardApi, releaseCardApi, authTelegram, getProfile } from '@/lib/api'
import { getStoredToken, getStoredUser, storeAuth, clearAuth } from '@/lib/auth'
import { connectSocket, disconnectSocket, getSocket, joinGameRoom, leaveGameRoom, ensureSocketConnected } from '@/lib/socket'
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
  const [authAttempted, setAuthAttempted] = useState(false)

  const tryRestoreSession = useCallback(async () => {
    const storedUser = getStoredUser()
    const token = getStoredToken()
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user

    // Check if we have all required data for session restoration
    if (!token || !storedUser) {
      return false
    }

    // Verify Telegram ID matches stored user
    if (tgUser) {
      const currentTgId = String(tgUser.id)
      if (String(storedUser.telegramId) !== currentTgId) {
        console.warn('Telegram ID mismatch, clearing auth')
        clearAuth()
        return false
      }
    }

    try {
      // Validate the stored session by fetching fresh profile
      const fresh = await getProfile()
      setUser(fresh)
      storeAuth(token, fresh)
      connectSocket(token)
      setAuthAttempted(true)
      return true
    } catch (error) {
      console.error('Session restoration failed:', error)
      clearAuth()
      return false
    }
  }, [])

  const authenticateWithTelegram = useCallback(async () => {
    const tg = window.Telegram?.WebApp
    const initData = tg?.initData

    if (!initData) {
      setError('Not available in Telegram Mini App')
      setLoading(false)
      setAuthAttempted(true)
      return false
    }

    try {
      const result = await authTelegram(initData)
      storeAuth(result.token, result.user, initData)
      setUser(result.user)
      connectSocket(result.token)
      setAuthAttempted(true)
      return true
    } catch (error) {
      console.error('Telegram authentication failed:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed')
      clearAuth()
      setLoading(false)
      setAuthAttempted(true)
      return false
    }
  }, [])

  const initializeAuth = useCallback(async () => {
    try {
      // Expand Telegram WebApp
      const tg = window.Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand()
      }

      // Try to restore session first
      const restored = await tryRestoreSession()
      if (restored) {
        return
      }

      // Fall back to Telegram authentication
      await authenticateWithTelegram()
    } catch (error) {
      console.error('Authentication initialization failed:', error)
      setError(error instanceof Error ? error.message : 'Authentication failed')
      clearAuth()
      setLoading(false)
      setAuthAttempted(true)
    }
  }, [tryRestoreSession, authenticateWithTelegram])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      if (!isMounted) return
      await initializeAuth()
      if (isMounted) {
        setLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [initializeAuth])

  const fetchGame = useCallback(async () => {
    if (!user) return

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
    } catch (error) {
      console.error('Failed to fetch game:', error)
      setError('Failed to load game')
    } finally {
      setLoading(false)
    }
  }, [user, router])

  const refreshUser = useCallback(async () => {
    if (!user) return

    try {
      const fresh = await getProfile()
      setUser(fresh)
      const token = getStoredToken()
      if (token) storeAuth(token, fresh)
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }, [user])

  useEffect(() => {
    if (!user || loading) return
    fetchGame()
  }, [user, loading, fetchGame])

  // Selection countdown logic
  const [selCountdownEnd, setSelCountdownEnd] = useState<number | null>(null)

  useEffect(() => {
    if (selCountdownEnd === null) return
    
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((selCountdownEnd - Date.now()) / 1000))
      setSelectionCountdown(remaining)
      if (remaining <= 0) setSelCountdownEnd(null)
    }
    
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [selCountdownEnd])

  useEffect(() => {
    if (selectionCountdown !== null && selectionCountdown > 0) {
      setSelCountdownEnd(Date.now() + selectionCountdown * 1000)
    }
  }, [selectionCountdown])

  // Handle visibility change to re-fetch data
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const sock = ensureSocketConnected()
        if (sock?.connected) {
          fetchGame()
          refreshUser()
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchGame, refreshUser])

  // Socket connection management
  useEffect(() => {
    if (!game) return
    
    try {
      joinGameRoom(game._id)
    } catch (error) {
      console.error('Failed to join game room:', error)
    }
    
    return () => {
      try {
        leaveGameRoom(game._id)
      } catch (error) {
        console.error('Failed to leave game room:', error)
      }
    }
  }, [game])

  // Socket event listeners
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

    const handleCountdown = (data: unknown) => {
      const d = data as { gameId: string; phase?: string; seconds?: number }
      if (d.phase === 'selection') {
        setSelectionCountdown(d.seconds ?? 30)
        fetchGame()
      } else {
        goToGame(data)
      }
    }

    const handleSync = (data: unknown) => {
      const d = data as { gameId: string; status: string; countdownRemaining?: number; phase?: string }
      if (d.phase === 'selection' && d.countdownRemaining !== undefined) {
        setSelectionCountdown(Math.ceil(d.countdownRemaining))
      } else if (d.status !== 'selection') {
        setSelectionCountdown(null)
      }
    }

    const handleCardSelected = (data: unknown) => {
      const d = data as { cardId: string }
      setCards((prev) => prev.map((c) =>
        c._id === d.cardId ? { ...c, status: 'selected' } : c
      ))
    }

    const handleCardPurchased = (data: unknown) => {
      const d = data as { cardId: string; userId: string }
      setCards((prev) => prev.map((c) =>
        c._id === d.cardId
          ? { ...c, status: 'purchased', isOwnedByMe: d.userId === user?._id }
          : c
      ))
      refreshWithUser()
    }

    const handleCardReleased = (data: unknown) => {
      const d = data as { cardId: string }
      setCards((prev) => prev.map((c) =>
        c._id === d.cardId
          ? { ...c, status: 'available', isOwnedByMe: false }
          : c
      ))
      refreshWithUser()
    }

    sock.on('game:countdown', handleCountdown)
    sock.on('game:started', goToGame)
    sock.on('game:winner', refresh)
    sock.on('game:cancelled', refresh)
    sock.on('game:sync', handleSync)
    sock.on('card:selected', handleCardSelected)
    sock.on('card:purchased', handleCardPurchased)
    sock.on('card:released', handleCardReleased)

    return () => {
      sock.off('game:countdown', handleCountdown)
      sock.off('game:started', goToGame)
      sock.off('game:winner', refresh)
      sock.off('game:cancelled', refresh)
      sock.off('game:sync', handleSync)
      sock.off('card:selected', handleCardSelected)
      sock.off('card:purchased', handleCardPurchased)
      sock.off('card:released', handleCardReleased)
    }
  }, [fetchGame, refreshUser, router, user])

  const handleSelect = async (card: BingoCard) => {
    if (!game || !user) return
    
    setActionLoading(true)
    setError('')
    
    try {
      await selectCard(game._id, card._id)
      
      try {
        await purchaseCardApi(game._id, card._id)
      } catch (purchaseError) {
        // If purchase fails, release the card
        await releaseCardApi(game._id, card._id).catch(() => {})
        throw new Error('Insufficient balance to purchase this card')
      }
      
      const [allCards, fresh] = await Promise.all([
        getGameCards(game._id),
        getProfile()
      ])
      
      setCards(allCards)
      setUser(fresh)
      
      const token = getStoredToken()
      if (token) storeAuth(token, fresh)
    } catch (error) {
      console.error('Failed to select card:', error)
      setError(error instanceof Error ? error.message : 'Failed to purchase card')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRelease = async (card: BingoCard) => {
    if (!game || !user) return
    
    setActionLoading(true)
    setError('')
    
    try {
      await releaseCardApi(game._id, card._id)
      
      const [allCards, fresh] = await Promise.all([
        getGameCards(game._id),
        getProfile()
      ])
      
      setCards(allCards)
      setUser(fresh)
      
      const token = getStoredToken()
      if (token) storeAuth(token, fresh)
    } catch (error) {
      console.error('Failed to release card:', error)
      setError(error instanceof Error ? error.message : 'Failed to release card')
    } finally {
      setActionLoading(false)
    }
  }

  // Loading state
  if (loading || !authAttempted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-72 h-72 rounded-full bg-purple-500/10 blur-3xl top-[-10%] left-[-10%] animate-float" style={{animationDelay:'0s'}} />
          <div className="absolute w-96 h-96 rounded-full bg-amber-500/10 blur-3xl bottom-[-20%] right-[-10%] animate-float" style={{animationDelay:'1.5s'}} />
          <div className="absolute w-48 h-48 rounded-full bg-pink-500/10 blur-3xl top-[40%] right-[20%] animate-float" style={{animationDelay:'3s'}} />
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-white/20 animate-float"
              style={{
                top: `${5 + Math.random() * 90}%`,
                left: `${5 + Math.random() * 90}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                opacity: 0.3 + Math.random() * 0.4,
              }}
            />
          ))}
        </div>

        <div className="text-center animate-slide-up relative z-10">
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 animate-ball-bounce shadow-2xl shadow-purple-500/30 flex items-center justify-center">
              <div className="absolute inset-1 rounded-full bg-white/10" />
              <span className="text-3xl relative z-10 animate-ball-spin" style={{transformOrigin:'center center'}}>🎯</span>
            </div>
            <div className="absolute inset-[-8px] rounded-full border-2 border-purple-400/20 animate-ping" style={{animationDuration:'3s'}} />
            <div className="absolute inset-[-16px] rounded-full border border-purple-400/10 animate-ping" style={{animationDuration:'4s', animationDelay:'1s'}} />
          </div>

          <h1 className="text-4xl font-extrabold mb-1 text-white tracking-tight">
            Ato Bingo
          </h1>
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
            <p className="text-purple-200/80 font-medium text-sm">
              {error || 'Connecting...'}
            </p>
          </div>

          <div className="w-48 mx-auto">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-amber-400 animate-shimmer" style={{width:'60%'}} />
            </div>
          </div>

          {error && (
            <button
              onClick={() => {
                setError('')
                setLoading(true)
                setAuthAttempted(false)
                window.location.reload()
              }}
              className="mt-8 px-8 py-3 rounded-2xl font-bold text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all backdrop-blur-sm active:scale-95"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)' }}>
        <div className="text-center relative z-10">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-purple-200/80 mb-8">{error || 'Please authenticate to continue'}</p>
          <button
            onClick={() => {
              setLoading(true)
              setAuthAttempted(false)
              window.location.reload()
            }}
            className="px-8 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg transition-all active:scale-95"
          >
            Retry Authentication
          </button>
        </div>
      </div>
    )
  }

  const cardPrice = game?.cardPrice ?? 10
  const canAfford = user.balance >= cardPrice
  const isSelection = game?.status === 'selection'
  const myCards = cards.filter(c => c.isOwnedByMe)

  return (
    <div className="pb-24 animate-fade-in">
      <div className="p-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200 shadow-2xl shadow-purple-300/20 animate-float">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">Ato Bingo</h1>
              <p className="text-xs text-gray-400 font-medium">
                Welcome back, <span className="text-purple-500">{user.firstName}</span>
              </p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-gray-100/80 shadow-sm text-right">
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Balance</div>
            <div className="text-xl font-extrabold text-purple-600 number-transition flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {user.balance.toFixed(2)} <span className="text-sm font-semibold text-purple-400">Br</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100 animate-slide-down flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {!game ? (
          <div className="text-center py-16 bg-white/60 rounded-2xl border border-gray-100 animate-scale-in">
            <div className="text-5xl mb-4 animate-float">🎲</div>
            <p className="text-gray-400 font-semibold">No game available right now</p>
            <p className="text-sm text-gray-300 mt-1">Check back soon</p>
          </div>
        ) : isSelection ? (
          (canAfford || myCards.length > 0) ? (
            <div>
              {selectionCountdown !== null && selectionCountdown > 0 && (
                <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 mb-4 text-center animate-slide-down">
                  <div className="flex items-center justify-center gap-3">
                    <div className="number-callout text-amber-600 text-3xl min-w-[60px]">{selectionCountdown}</div>
                    <div className="text-left">
                      <div className="font-bold text-amber-700 text-sm">Card Selection Ending Soon!</div>
                      <div className="text-xs text-amber-500">Buy your cards before time runs out</div>
                    </div>
                  </div>
                  <div className="progress-bar mt-3">
                    <div
                      className="progress-bar-accent"
                      style={{ width: `${(selectionCountdown / 30) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="card-hover mb-4 flex items-center justify-between animate-slide-up">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-purple-200">
                    #{game.gameCode}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">Game #{game.gameCode}</span>
                    <span className="ml-2 badge-primary text-[10px]">{game.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-extrabold text-amber-500">{Math.floor(game.prizePool * 0.8)}</span>
                  <span className="text-gray-400 text-xs">Birr prize</span>
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
            <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 animate-wiggle">
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
          <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center animate-scale-in">
            <div className="text-sm text-gray-400 mb-3">
              Game #{game.gameCode} is <span className="font-semibold text-purple-500 capitalize">{game.status}</span>
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