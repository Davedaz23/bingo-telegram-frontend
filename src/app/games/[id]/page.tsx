'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getGame,
  getGameCards,
  selectCard,
  releaseCardApi,
  claimBingoApi,
} from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import { useSocket } from '@/hooks/useSocket'
import { getSocket, joinGameRoom, leaveGameRoom } from '@/lib/socket'
import NavBar from '@/components/NavBar'
import CardSelector from '@/components/CardSelector'
import type { User, Game, BingoCard } from '@/types'

const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1)
const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

export default function GameDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [cards, setCards] = useState<BingoCard[]>([])
  const [myCards, setMyCards] = useState<BingoCard[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [placedBingo, setPlacedBingo] = useState(false)
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([])
  const [winnerCountdown, setWinnerCountdown] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const { on } = useSocket()

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    try {
      const sock = getSocket()
      setConnected(sock.connected)
      const onConnect = () => setConnected(true)
      const onDisconnect = () => setConnected(false)
      sock.on('connect', onConnect)
      sock.on('disconnect', onDisconnect)
      return () => {
        sock.off('connect', onConnect)
        sock.off('disconnect', onDisconnect)
      }
    } catch {
      return
    }
  }, [])

  const fetchGame = useCallback(async () => {
    try {
      const g = await getGame(id)
      setGame(g)
      if (g.countdownStartedAt) {
        const elapsed = (Date.now() - new Date(g.countdownStartedAt).getTime()) / 1000
        setCountdown(Math.max(0, 30 - elapsed))
      }
    } catch {
      setError('Failed to load game')
    }
  }, [id])

  const fetchCards = useCallback(async () => {
    try {
      const allCards = await getGameCards(id)
      setCards(allCards)
    } catch {
      // ignore
    }
  }, [id])

  useEffect(() => {
    fetchGame()
    fetchCards()
    joinGameRoom(id)
    return () => { leaveGameRoom(id) }
  }, [id, fetchGame, fetchCards])

  useEffect(() => {
    if (!on) return

    const unsubs: (() => void)[] = []

    unsubs.push(on('game:countdown', (data: unknown) => {
      const d = data as { seconds: number }
      setCountdown(d.seconds)
    }))

    unsubs.push(on('game:started', () => {
      fetchGame()
    }))

    unsubs.push(on('game:numberDrawn', (data: unknown) => {
      const d = data as { drawnNumbers: number[] }
      setGame((prev) => prev ? { ...prev, drawnNumbers: d.drawnNumbers } : prev)
    }))

    unsubs.push(on('game:winner', (data: unknown) => {
      const d = data as { winner?: { userId: string }; prizeAmount: number }
      setGame((prev) => prev ? {
        ...prev,
        status: 'finished',
        winner: { userId: d.winner?.userId || '', prizeAmount: d.prizeAmount },
      } : prev)
      setWinnerCountdown(10)
    }))

    unsubs.push(on('game:cancelled', () => {
      fetchGame()
    }))

    unsubs.push(on('card:purchased', () => {
      fetchCards()
    }))

    unsubs.push(on('card:released', () => {
      fetchCards()
    }))

    return () => { unsubs.forEach((fn) => fn()) }
  }, [on, fetchGame, fetchCards])

  useEffect(() => {
    if (!game || !user) return
    const purchased = cards.filter((c) => c.isOwnedByMe)
    setMyCards(purchased)
  }, [cards, game, user])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => {
    if (winnerCountdown === null || winnerCountdown <= 0) return
    const timer = setInterval(() => {
      setWinnerCountdown((prev) => {
        if (prev !== null && prev > 1) return prev - 1
        if (prev === 1) {
          router.push('/')
          return 0
        }
        return 0
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [winnerCountdown, router])

  const handleSelect = async (card: BingoCard) => {
    setLoading(true)
    setError('')
    try {
      await selectCard(id, card._id)
      await Promise.all([fetchCards(), fetchGame()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to purchase card')
    } finally {
      setLoading(false)
    }
  }

  const handleRelease = async (card: BingoCard) => {
    setLoading(true)
    setError('')
    try {
      await releaseCardApi(id, card._id)
      await Promise.all([fetchCards(), fetchGame()])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to release card')
    } finally {
      setLoading(false)
    }
  }

  const handleBingo = async () => {
    setLoading(true)
    setError('')
    try {
      await claimBingoApi(id)
      setPlacedBingo(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to claim bingo')
    } finally {
      setLoading(false)
    }
  }

  const toggleMark = (num: number) => {
    if (!drawnNumbers.includes(num)) return
    setMarkedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }

  if (!user) return null

  if (error && !game) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => { setError(''); fetchGame() }} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center" style={{ color: '#c39977' }}>
          Loading game...
        </div>
      </div>
    )
  }

  const isFinished = game.status === 'finished' || game.status === 'cancelled'
  const drawnNumbers = game.drawnNumbers || []
  const lastNumber = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null
  const lastThree = drawnNumbers.slice(-3)

  return (
    <div className="pb-20">
      <div className="p-3 max-w-lg mx-auto">
        {/* Connection status */}
        <div className="flex items-center justify-end mb-1 gap-2">
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`}
            />
            <span className="text-[9px]" style={{ color: '#c39977' }}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold">Game #{game.gameCode}</h1>
            <p className="text-xs capitalize" style={{ color: '#c39977' }}>
              {game.status === 'starting' ? 'Starting...' : game.status === 'active' ? 'In Progress' : game.status}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: '#c39977' }}>Prize</div>
            <div className="text-base font-bold" style={{ color: '#0ca3db' }}>
              {game.prizePool.toFixed(2)} Birr
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-xs p-2 rounded-lg mb-2">{error}</div>
        )}

        {countdown !== null && countdown > 0 && game.status === 'starting' && (
          <div className="card mb-3 text-center py-4">
            <div className="text-xs" style={{ color: '#c39977' }}>Game starting in</div>
            <div className="text-2xl font-bold mt-1" style={{ color: '#0ca3db' }}>
              {Math.ceil(countdown)}s
            </div>
          </div>
        )}

        {game.status === 'active' && (
          <div>
            {/* Last 3 called numbers */}
            {lastThree.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px]" style={{ color: '#c39977' }}>Last:</span>
                {lastThree.map((n, i) => (
                  <span
                    key={i}
                    className={`font-bold ${n === lastNumber ? 'text-base' : 'text-xs opacity-60'}`}
                    style={{ color: n === lastNumber ? '#0ca3db' : '#c39977' }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-1">
              {/* Left: All 75 numbers */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-5 gap-[1.5px]">
                  {ALL_NUMBERS.map((n) => {
                    const isDrawn = drawnNumbers.includes(n)
                    const isCurrent = n === lastNumber
                    const isRecent = lastThree.includes(n)
                    return (
                      <div
                        key={n}
                        className={`text-center text-[10px] leading-none py-[3px] rounded-sm ${
                          isCurrent
                            ? 'font-bold text-white'
                            : isDrawn
                            ? 'font-semibold'
                            : ''
                        }`}
                        style={{
                          backgroundColor: isCurrent
                            ? '#0ca3db'
                            : isDrawn
                            ? '#ffffff'
                            : 'transparent',
                          color: isCurrent
                            ? '#ffffff'
                            : isDrawn
                            ? '#0ca3db'
                            : '#c39977',
                          border: isRecent && !isCurrent ? '1.5px solid #0ca3db' : '1px solid transparent',
                        }}
                      >
                        {n}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right: Player card */}
              <div className="w-[120px] flex-shrink-0">
                {myCards.length > 0 ? (
                  myCards.map((card) => (
                    <div key={card._id}>
                      <div className="flex items-center justify-between mb-[2px]">
                        <span className="text-[10px] font-bold">#{card.cardNumber}</span>
                        <button
                          onClick={handleBingo}
                          className="text-[10px] px-2 py-[2px] rounded font-bold"
                          style={{
                            backgroundColor: '#0ca3db',
                            color: '#ffffff',
                            border: 'none',
                          }}
                          disabled={loading || placedBingo}
                        >
                          {placedBingo ? '✓' : loading ? '...' : 'BINGO'}
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-[1px]">
                        {COLUMNS.map((col) =>
                          (card.card ? card.card[col] : [0, 0, 0, 0, 0]).map((num: number, idx: number) => {
                            const isFree = num === 0
                            const isMarked = markedNumbers.includes(num) || isFree
                            const canTap = drawnNumbers.includes(num) && !isFree
                            return (
                              <button
                                key={`${col}-${idx}`}
                                onClick={() => canTap && toggleMark(num)}
                                className="text-center text-[9px] leading-none py-[2px] rounded-sm"
                                style={{
                                  backgroundColor: isMarked
                                    ? '#0ca3db'
                                    : '#ffffff',
                                  color: isMarked
                                    ? '#ffffff'
                                    : '#1a1a2e',
                                  border: 'none',
                                  opacity: canTap ? 1 : 0.4,
                                }}
                              >
                                {isFree ? '★' : num}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs" style={{ color: '#c39977' }}>
                    No cards
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {game.status === 'selection' && (
          <CardSelector
            cards={cards}
            cardPrice={game.cardPrice}
            onSelect={handleSelect}
            onRelease={handleRelease}
            loading={loading}
          />
        )}

        {isFinished && (
          <div className="card text-center mb-4 py-4">
            {winnerCountdown !== null && (
              <div className="text-2xl font-bold mb-2" style={{ color: '#0ca3db' }}>
                {winnerCountdown}s
              </div>
            )}
            {game.winner && user && game.winner.userId === user._id ? (
              <div>
                <div className="text-2xl mb-1">🎉</div>
                <div className="font-bold text-green-500">You Won!</div>
                <div className="text-xs mt-1" style={{ color: '#c39977' }}>
                  Prize: {game.winner.prizeAmount?.toFixed(2)} Birr
                </div>
              </div>
            ) : game.winner ? (
              <div>
                <div className="text-sm font-medium">Game Won</div>
                <div className="text-xs mt-1" style={{ color: '#c39977' }}>
                  Another player won this game
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium">Game {game.status === 'cancelled' ? 'Cancelled' : 'Finished'}</div>
                <div className="text-xs mt-1" style={{ color: '#c39977' }}>
                  {game.status === 'cancelled' ? 'Refunds processed' : 'No winner'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
