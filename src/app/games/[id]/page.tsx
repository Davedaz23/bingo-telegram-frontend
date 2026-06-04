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
  const [animatingNumber, setAnimatingNumber] = useState<number | null>(null)
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
      console.log('Fetched game:', g)
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
      const prev = game?.drawnNumbers || []
      const newNum = d.drawnNumbers.length > prev.length
        ? d.drawnNumbers[d.drawnNumbers.length - 1]
        : null
      if (newNum) {
        setAnimatingNumber(newNum)
        setTimeout(() => setAnimatingNumber(null), 600)
      }
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
  }, [on, fetchGame, fetchCards, game?.drawnNumbers])

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
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-rose-500 font-semibold mb-4">{error}</p>
          <button onClick={() => { setError(''); fetchGame() }} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)' }}>
        <div className="text-center animate-pulse-soft">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🎯</span>
          </div>
          <p className="text-purple-300 font-medium">Loading game...</p>
        </div>
      </div>
    )
  }

  const isFinished = game.status === 'finished' || game.status === 'cancelled'
  const drawnNumbers = game.drawnNumbers || []
  const lastNumber = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null
  const lastThree = drawnNumbers.slice(-3)
  const gameWon = game.winner && user && game.winner.userId === user._id

  return (
    <div className="pb-24">
      <div className="p-3 max-w-lg mx-auto">
        {/* Connection + header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              ←
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">Game #{game.gameCode}</h1>
              <p className="text-xs text-gray-400 capitalize">
                {game.status === 'starting' ? 'Starting...' : game.status === 'active' ? 'In Progress' : game.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className={`text-[10px] font-semibold ${connected ? 'text-emerald-500' : 'text-rose-400'}`}>
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-medium">Prize</div>
              <div className="text-sm font-extrabold text-amber-500">
                {game.prizePool.toFixed(2)} Br
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm font-medium p-3 rounded-2xl mb-3 border border-rose-100">
            {error}
          </div>
        )}

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-3 text-center">
            {game.status === 'selection' ? (
              <>
                <div className="text-sm text-amber-500 font-bold mb-1">Card selection ends in</div>
                <div className="text-4xl font-extrabold text-amber-500 animate-bounce-in">
                  {Math.ceil(countdown)}s
                </div>
                <p className="text-xs text-gray-400 mt-1">Buy your cards before time runs out</p>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-400 font-medium mb-1">Game starting in</div>
                <div className="text-4xl font-extrabold text-purple-600 animate-bounce-in">
                  {Math.ceil(countdown)}s
                </div>
              </>
            )}
            <div className="flex justify-center gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-purple-300 animate-pulse-dot" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Active game */}
        {game.status === 'active' && (
          <div>
            {/* Last called numbers */}
            {lastThree.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-xs text-gray-400 font-medium">Last:</span>
                {lastThree.map((n, i) => (
                  <span
                    key={i}
                    className={`font-extrabold rounded-xl px-2.5 py-1 ${
                      n === lastNumber
                        ? 'text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-200 animate-bounce-in'
                        : 'text-gray-400 bg-gray-100'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              {/* All 75 numbers */}
              <div className="flex-1 min-w-0">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-100">
                  <div className="grid grid-cols-5 gap-[3px]">
                    {ALL_NUMBERS.map((n) => {
                      const isDrawn = drawnNumbers.includes(n)
                      const isCurrent = n === lastNumber
                      const isRecent = lastThree.includes(n)
                      return (
                        <div
                          key={n}
                          className={`text-center rounded-lg py-[5px] transition-all duration-200 ${
                            isCurrent ? 'font-extrabold' : isDrawn ? 'font-bold' : 'font-medium'
                          }`}
                          style={{
                            fontSize: isCurrent ? '15px' : '11px',
                            background: isCurrent
                              ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                              : isDrawn
                              ? 'rgba(109, 40, 217, 0.08)'
                              : 'transparent',
                            color: isCurrent
                              ? '#ffffff'
                              : isDrawn
                              ? '#6D28D9'
                              : '#9CA3AF',
                            boxShadow: isCurrent ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
                          }}
                        >
                          {n}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Player card */}
              <div className="w-[150px] flex-shrink-0">
                {myCards.length > 0 ? (
                  <div className="space-y-2">
                    {myCards.map((card) => (
                      <div key={card._id} className="bg-white rounded-2xl p-2.5 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs text-gray-600">#{card.cardNumber}</span>
                          <button
                            onClick={handleBingo}
                            className="text-[10px] px-3 py-1.5 rounded-xl font-extrabold tracking-wider transition-all"
                            style={{
                              background: placedBingo
                                ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                                : 'linear-gradient(135deg, #6D28D9, #5B21B6)',
                              color: '#ffffff',
                              boxShadow: placedBingo
                                ? '0 2px 8px rgba(245, 158, 11, 0.3)'
                                : '0 2px 8px rgba(109, 40, 217, 0.25)',
                            }}
                            disabled={loading || placedBingo}
                          >
                            {placedBingo ? '★ WIN' : loading ? '...' : 'BINGO'}
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-[2px]">
                          {[0, 1, 2, 3, 4].map((rowIdx) =>
                            COLUMNS.map((col) => {
                              const nums = card.card ? card.card[col] : [0, 0, 0, 0, 0]
                              const num: number = nums[rowIdx]
                              const isFree = num === 0
                              const isMarked = markedNumbers.includes(num) || isFree
                              const canTap = drawnNumbers.includes(num) && !isFree
                              const isNewDrawn = num === animatingNumber
                              return (
                                <button
                                  key={`${col}-${rowIdx}`}
                                  onClick={() => canTap && toggleMark(num)}
                                  className="text-center font-bold rounded-lg transition-all"
                                  style={{
                                    fontSize: isFree ? '9px' : '12px',
                                    padding: '4px 0',
                                    background: isMarked
                                      ? isFree
                                        ? 'rgba(245, 158, 11, 0.12)'
                                        : 'linear-gradient(135deg, #6D28D9, #5B21B6)'
                                      : '#FFFFFF',
                                    color: isMarked
                                      ? isFree ? '#D97706' : '#ffffff'
                                      : '#374151',
                                    border: '1.5px solid',
                                    borderColor: isMarked
                                      ? 'transparent'
                                      : '#F3F4F6',
                                    boxShadow: isMarked && !isFree
                                      ? '0 1px 4px rgba(109, 40, 217, 0.2)'
                                      : 'none',
                                    opacity: isFree ? 0.5 : 1,
                                    animation: isNewDrawn && isMarked ? 'bounceIn 0.5s ease-out' : 'none',
                                  }}
                                >
                                  {isFree ? '⭐' : num}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                    <div className="text-2xl mb-2">🎴</div>
                    <p className="text-xs text-gray-400">No cards</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selection phase */}
        {game.status === 'selection' && (
          <CardSelector
            cards={cards}
            cardPrice={game.cardPrice}
            onSelect={handleSelect}
            onRelease={handleRelease}
            loading={loading}
          />
        )}

        {/* Finished */}
        {isFinished && (
          <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center mb-4">
            {winnerCountdown !== null && (
              <div className="text-5xl font-extrabold text-amber-500 mb-3 animate-bounce-in">
                {winnerCountdown}s
              </div>
            )}
            {game.winner && user && game.winner.userId === user._id ? (
              <div className="animate-slide-up">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-200 animate-gold-pulse">
                  <span className="text-4xl">👑</span>
                </div>
                <div className="font-extrabold text-2xl text-amber-600 mb-1">You Won!</div>
                <div className="text-lg font-bold text-purple-600">
                  {game.winner.prizeAmount?.toFixed(2)} Birr
                </div>
              </div>
            ) : game.winner ? (
              <div>
                <div className="text-4xl mb-3">🎉</div>
                <div className="font-bold text-lg text-gray-900">Game Won</div>
                <p className="text-sm text-gray-400 mt-1">
                  Another player won this game
                </p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">{game.status === 'cancelled' ? '🚫' : '📭'}</div>
                <div className="font-bold text-lg text-gray-900">
                  Game {game.status === 'cancelled' ? 'Cancelled' : 'Finished'}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {game.status === 'cancelled' ? 'Refunds processed' : 'No winner'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
