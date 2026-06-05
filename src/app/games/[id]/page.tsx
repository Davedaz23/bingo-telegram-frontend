'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import BingoBoard from '@/components/BingoBoard'
import type { User, Game, BingoCard, CardData, WinningLine } from '@/types'

const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1)
const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

function Confetti() {
  const pieces = useRef<{ id: number; left: string; delay: string; duration: string; bg: string; size: number; shape: string }[]>([])
  if (pieces.current.length === 0) {
    const colors = ['#F59E0B', '#6D28D9', '#FBBF24', '#8B5CF6', '#D97706', '#7C3AED', '#10B981', '#EC4899']
    const shapes = ['50%', '2px', '40% 0 60%']
    for (let i = 0; i < 60; i++) {
      pieces.current.push({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${2.5 + Math.random() * 3.5}s`,
        bg: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 10,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      })
    }
  }
  return (
    <div className="confetti-container">
      {pieces.current.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.bg,
            width: p.size,
            height: p.size * 0.6,
            borderRadius: p.shape,
          }}
        />
      ))}
    </div>
  )
}

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
  const [winnerCardData, setWinnerCardData] = useState<CardData | null>(null)
  const [winningLine, setWinningLine] = useState<WinningLine | null>(null)
  const hasNavigated = useRef(false)
  const { on, fresh } = useSocket()

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
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
    try {
      const sock = getSocket()
      setConnected(sock.connected)
      const onConnect = () => {
        setConnected(true)
        joinGameRoom(id)
        fetchGame()
        fetchCards()
      }
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
  }, [id, fetchGame, fetchCards])

  useEffect(() => {
    if (!on) return

    const unsubs: (() => void)[] = []

    unsubs.push(on('game:joined', (data: unknown) => {
      const d = data as { gameId: string; status: string; drawnNumbers: number[]; playerCount: number; prizePool: number }
      setGame((prev) => prev ? {
        ...prev,
        status: d.status as Game['status'],
        drawnNumbers: d.drawnNumbers || [],
        prizePool: d.prizePool,
      } : prev)
      fetchCards()
    }))

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
      const d = data as {
        winner?: { userId: string; firstName?: string; username?: string }
        prizeAmount: number
        winningLine?: { type: string; index?: number }
        winnerCard?: CardData
      }
      setWinningLine(d.winningLine ? { type: d.winningLine.type as WinningLine['type'], index: d.winningLine.index } : null)
      if (d.winnerCard) setWinnerCardData(d.winnerCard)
      setGame((prev) => prev ? {
        ...prev,
        status: 'finished',
        winner: {
          userId: d.winner?.userId || '',
          prizeAmount: d.prizeAmount,
          winningLine: d.winningLine ? { type: d.winningLine.type as WinningLine['type'], index: d.winningLine.index } : undefined,
        },
      } : prev)
      setWinnerCountdown(10)
      hasNavigated.current = false
    }))

    unsubs.push(on('game:sync', (data: unknown) => {
      const d = data as { status: string; drawnNumbers?: number[]; countdownRemaining?: number; phase?: string }
      if (d.countdownRemaining !== undefined) {
        setCountdown(Math.ceil(d.countdownRemaining))
      }
      if (d.drawnNumbers) {
        const prev = game?.drawnNumbers || []
        const newNum = d.drawnNumbers.length > prev.length
          ? d.drawnNumbers[d.drawnNumbers.length - 1]
          : null
        if (newNum) {
          setAnimatingNumber(newNum)
          setTimeout(() => setAnimatingNumber(null), 600)
        }
        setGame((prev) => prev ? { ...prev, drawnNumbers: d.drawnNumbers!, status: d.status as Game['status'] } : prev)
      } else if (d.status) {
        setGame((prev) => prev ? { ...prev, status: d.status as Game['status'] } : prev)
      }
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

  // ─── Re-fetch on visibility change (Telegram minimize/restore) ────────────
  useEffect(() => {
    if (fresh === 0) return
    fetchGame()
    fetchCards()
  }, [fresh, fetchGame, fetchCards])

  useEffect(() => {
    if (!game || !user) return
    const purchased = cards.filter((c) => c.isOwnedByMe)
    setMyCards(purchased)
  }, [cards, game, user])

  // ─── Countdown: use Date.now()-based end time for accuracy ─────────────────
  const [countdownEnd, setCountdownEnd] = useState<number | null>(null)

  useEffect(() => {
    if (countdownEnd === null) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((countdownEnd - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining <= 0) setCountdownEnd(null)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [countdownEnd])

  // Recalculates end when a new countdown value arrives (from socket or server)
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      setCountdownEnd(Date.now() + countdown * 1000)
    }
  }, [countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Winner countdown: same Date.now() approach ───────────────────────────
  const [winnerCountdownEnd, setWinnerCountdownEnd] = useState<number | null>(null)

  useEffect(() => {
    if (winnerCountdownEnd === null) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((winnerCountdownEnd - Date.now()) / 1000))
      setWinnerCountdown(remaining)
      if (remaining <= 0) {
        setWinnerCountdownEnd(null)
        if (!hasNavigated.current) {
          hasNavigated.current = true
          router.push('/')
        }
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [winnerCountdownEnd, router])

  useEffect(() => {
    if (winnerCountdown !== null && winnerCountdown > 0) {
      setWinnerCountdownEnd(Date.now() + winnerCountdown * 1000)
    }
  }, [winnerCountdown]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="text-center animate-scale-in">
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-200">
            <span className="text-2xl animate-spin-slow">🎯</span>
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
    <div className="pb-24 animate-fade-in">
      <div className="p-3 max-w-lg mx-auto">
        {/* Connection + header */}
        <div className="flex items-center justify-between mb-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all hover:border-purple-200 active:scale-90">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">Game #{game.gameCode}</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <p className="text-xs text-gray-400 capitalize">
                  {game.status === 'starting' ? 'Starting...' : game.status === 'active' ? 'In Progress' : game.status}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-medium">Prize Pool</div>
              <div className="text-sm font-extrabold text-amber-500 number-transition">
                {game.prizePool.toFixed(2)} Br
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm font-medium p-3 rounded-2xl mb-3 border border-rose-100 animate-slide-down flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-3 text-center animate-scale-in relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/30 to-transparent" />
            {game.status === 'selection' ? (
              <>
                <div className="text-sm text-amber-500 font-bold mb-1 relative">Card selection ends in</div>
                <div className="number-callout text-5xl text-amber-500 justify-center relative">
                  {Math.ceil(countdown)}
                </div>
                <p className="text-xs text-gray-400 mt-1 relative">Buy your cards before time runs out</p>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-400 font-medium mb-1 relative">Game starting in</div>
                <div className="number-callout text-5xl text-purple-600 justify-center relative">
                  {Math.ceil(countdown)}
                </div>
              </>
            )}
            <div className="flex justify-center gap-1.5 mt-3 relative">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-purple-300 animate-pulse-dot" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Active game */}
        {game.status === 'active' && (
          <div className="animate-fade-in">
            {/* Last called numbers */}
            {lastThree.length > 0 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-xs text-gray-400 font-medium">Last:</span>
                {lastThree.map((n, i) => (
                  <span
                    key={i}
                    className={`font-extrabold rounded-xl px-3 py-1.5 ${
                      n === lastNumber
                        ? 'number-callout text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-200 min-w-[36px]'
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
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2.5 border border-gray-100 shadow-sm">
                  <div className="grid grid-cols-5 gap-[3px]">
                    {ALL_NUMBERS.map((n) => {
                      const isDrawn = drawnNumbers.includes(n)
                      const isCurrent = n === lastNumber
                      return (
                        <div
                          key={n}
                          className={`text-center rounded-lg py-[5px] transition-all duration-300 ${
                            isCurrent ? 'font-extrabold' : isDrawn ? 'font-bold' : 'font-medium'
                          } ${isCurrent ? 'animate-number-pop' : ''}`}
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
              <div className="w-[160px] flex-shrink-0">
                {myCards.length > 0 ? (
                  <div className="space-y-2">
                    {myCards.map((card, ci) => (
                      <div key={card._id} className="bg-white rounded-2xl p-2.5 border border-gray-100 shadow-sm animate-slide-up" style={{ animationDelay: `${ci * 0.1}s` }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs text-gray-600">#{card.cardNumber}</span>
                          <button
                            onClick={handleBingo}
                            className={`text-[10px] px-3 py-1.5 rounded-xl font-extrabold tracking-wider transition-all active:scale-90 ${
                              placedBingo
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-200'
                                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-200'
                            }`}
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
                                  className="text-center font-bold rounded-lg transition-all active:scale-90"
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
                    <div className="text-2xl mb-2 animate-float">🎴</div>
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
          <div className="mb-4 animate-fade-in">
            {game.status === 'finished' && game.winner && <Confetti />}
            <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center relative overflow-hidden">
              {winnerCountdown !== null && (
                <div className="text-5xl font-extrabold text-amber-500 mb-3 animate-bounce-in">
                  {winnerCountdown}
                </div>
              )}
              {game.winner && user && game.winner.userId === user._id ? (
                <div className="animate-slide-up">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-amber-200 pulse-ring" style={{ animation: 'crownBounce 1.5s ease-in-out infinite' }}>
                    <span className="text-4xl">👑</span>
                  </div>
                  <div className="font-extrabold text-2xl text-amber-600 mb-1">You Won!</div>
                  <div className="text-lg font-bold text-purple-600 mb-4">
                    {game.winner.prizeAmount?.toFixed(2)} Birr
                  </div>
                  {myCards.length > 0 && myCards[0].card && (
                    <div className="flex justify-center">
                      <BingoBoard
                        card={myCards[0].card}
                        drawnNumbers={game.drawnNumbers || []}
                        won
                        winningLine={winningLine || game.winner?.winningLine || null}
                      />
                    </div>
                  )}
                </div>
              ) : game.winner ? (
                <div className="animate-slide-up">
                  <div className="text-4xl mb-2 animate-bounce-in">🎉</div>
                  <div className="font-bold text-lg text-gray-900 mb-1">Game Won!</div>
                  <p className="text-sm text-amber-500 font-semibold mb-3">
                    {game.winner.prizeAmount?.toFixed(2)} Birr prize
                  </p>
                  {winnerCardData && (
                    <div className="flex justify-center">
                      <BingoBoard
                        card={winnerCardData}
                        drawnNumbers={game.drawnNumbers || []}
                        won
                        winningLine={winningLine || null}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-slide-up">
                  <div className="text-4xl mb-3 animate-wiggle">{game.status === 'cancelled' ? '🚫' : '📭'}</div>
                  <div className="font-bold text-lg text-gray-900">
                    Game {game.status === 'cancelled' ? 'Cancelled' : 'Finished'}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {game.status === 'cancelled' ? 'Refunds processed' : 'No winner'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
