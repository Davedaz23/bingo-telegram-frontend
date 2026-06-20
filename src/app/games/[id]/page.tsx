'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getGame,
  getGameCards,
  selectCard,
  purchaseCardApi,
  releaseCardApi,
  markNumberApi,
  claimBingoApi,
} from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import { useSocket } from '@/hooks/useSocket'
import { getSocket, joinGameRoom, leaveGameRoom } from '@/lib/socket'
import { useSound } from '@/hooks/useSound'
import NavBar from '@/components/NavBar'
import CardSelector from '@/components/CardSelector'
import type { User, Game, BingoCard, CardData, WinningLine } from '@/types'

const ALL_NUMBERS = Array.from({ length: 75 }, (_, i) => i + 1)
const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

function WinnerModal({
  won, prizeAmount, winnerCardData, winningLine, drawnNumbers, gameCode, countdown, onClose,
}: {
  won: boolean
  prizeAmount?: number
  winnerCardData: CardData | null
  winningLine: WinningLine | null
  drawnNumbers: number[]
  gameCode: string
  countdown: number
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'modalBackdropIn 0.3s ease-out forwards' }}>
      {/* Confetti pieces */}
      <div className="confetti-container">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              background: ['#F59E0B', '#6D28D9', '#FBBF24', '#8B5CF6', '#D97706', '#7C3AED', '#10B981', '#EC4899'][Math.floor(Math.random() * 8)],
              width: 6 + Math.random() * 8,
              height: 4 + Math.random() * 6,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-sm animate-winner-modal">
        {/* Glow ring */}
        <div className="absolute inset-[-20px] rounded-3xl bg-gradient-to-r from-amber-400/20 via-purple-400/20 to-amber-400/20 blur-2xl animate-pulse-gold" />

        <div className="relative rounded-3xl p-6 bg-white shadow-2xl border border-amber-200/50 overflow-hidden">
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-purple-400 to-amber-400" />

          {won ? (
            <div className="text-center animate-slide-up-winner">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-200/50 pulse-ring">
                <span className="text-5xl animate-bounce-in">👑</span>
              </div>
              <h2 className="text-3xl font-extrabold text-amber-600 mb-1">You Won!</h2>
              <div className="text-5xl font-extrabold text-purple-600 mb-4 animate-number-pop">
                {prizeAmount?.toFixed(2)} <span className="text-2xl">Br</span>
              </div>

              {winnerCardData && (
                <div className="flex justify-center mb-4">
                  <div className="bg-gray-50 rounded-xl p-2 shadow-inner">
                    <BingoBoard
                      card={winnerCardData}
                      drawnNumbers={drawnNumbers}
                      won
                      winningLine={winningLine}
                    />
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-400 mb-4">
                Game <span className="font-bold text-gray-600">#{gameCode}</span>
              </div>

              <div className="text-2xl font-extrabold text-amber-500 mb-1 animate-bounce-in">
                {countdown}
              </div>
              <p className="text-xs text-gray-400">Returning home...</p>
            </div>
          ) : (
            <div className="text-center animate-slide-up-winner">
              <div className="text-5xl mb-3 animate-bounce-in">🎉</div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Game Won!</h2>
              <div className="text-3xl font-extrabold text-amber-500 mb-4">
                {prizeAmount?.toFixed(2)} Birr Prize
              </div>
              {winnerCardData && (
                <div className="flex justify-center mb-4">
                  <div className="bg-gray-50 rounded-xl p-2 shadow-inner">
                    <BingoBoard
                      card={winnerCardData}
                      drawnNumbers={drawnNumbers}
                      won
                      winningLine={winningLine}
                    />
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-400 mb-4">
                Game <span className="font-bold text-gray-600">#{gameCode}</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-500 mb-1 animate-bounce-in">
                {countdown}
              </div>
              <p className="text-xs text-gray-400">Returning home...</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-2xl font-bold text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function BingoBoard({
  card, drawnNumbers, won = false, winningLine = null,
}: {
  card: CardData
  drawnNumbers: number[]
  won?: boolean
  winningLine?: WinningLine | null
}) {
  const isWinningCell = (col: string, rowIdx: number): boolean => {
    if (!winningLine) return false
    const colIdx = COLUMNS.indexOf(col as typeof COLUMNS[number])
    const { type, index } = winningLine
    if (type === 'full_card') return true
    if (type === 'row' && index === rowIdx) return true
    if (type === 'column' && index === colIdx) return true
    if (type === 'four_corners') {
      return (rowIdx === 0 || rowIdx === 4) && (colIdx === 0 || colIdx === 4)
    }
    if (type === 'diagonal') {
      if (index === 0) return rowIdx === colIdx
      if (index === 1) return rowIdx === 4 - colIdx
    }
    return false
  }

  return (
    <div className="grid grid-cols-5 gap-1 w-fit mx-auto">
      {COLUMNS.map((col) => (
        <div key={col} className="bingo-cell-header text-xs sm:text-sm w-9 h-9 sm:w-11 sm:h-11">{col}</div>
      ))}
      {[0, 1, 2, 3, 4].map((rowIdx) =>
        COLUMNS.map((col) => {
          const nums = card[col] || []
          const num = nums[rowIdx]
          const isFree = num === 0
          const isMarked = isFree || drawnNumbers.includes(num)
          const isWinning = isWinningCell(col, rowIdx) && isMarked
          return (
            <div
              key={`${col}-${rowIdx}`}
              className={`bingo-cell w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm ${
                isWinning
                  ? 'bingo-cell-current'
                  : isMarked
                  ? 'bingo-cell-marked'
                  : 'bingo-cell-default'
              }`}
            >
              {isFree ? '⭐' : num}
            </div>
          )
        })
      )}
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
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winnerData, setWinnerData] = useState<{
    won: boolean
    prizeAmount?: number
    winnerCardData: CardData | null
    winningLine: WinningLine | null
  } | null>(null)
  const [calledNumberFlash, setCalledNumberFlash] = useState<number | null>(null)
  const hasNavigated = useRef(false)
  const { on, fresh } = useSocket()
  const sound = useSound()

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
      const d = data as { drawnNumbers: number[]; number: number }
      const prev = game?.drawnNumbers || []
      const newNum = d.drawnNumbers.length > prev.length
        ? d.drawnNumbers[d.drawnNumbers.length - 1]
        : null
      if (newNum) {
        setAnimatingNumber(newNum)
        setCalledNumberFlash(newNum)
        sound.numberDrawn(newNum)
        setTimeout(() => setAnimatingNumber(null), 600)
        setTimeout(() => setCalledNumberFlash(null), 2000)
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
      const isMyWin = d.winner?.userId === user?._id
      sound.win()
      setWinnerData({
        won: !!isMyWin,
        prizeAmount: d.prizeAmount,
        winnerCardData: d.winnerCard || null,
        winningLine: d.winningLine ? { type: d.winningLine.type as WinningLine['type'], index: d.winningLine.index } : null,
      })
      setShowWinnerModal(true)
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

    unsubs.push(on('card:selected', () => {
      fetchCards()
    }))

    unsubs.push(on('card:released', () => {
      fetchCards()
    }))

    return () => { unsubs.forEach((fn) => fn()) }
  }, [on, fetchGame, fetchCards, game?.drawnNumbers, user?._id, sound])

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
    // Restore marked numbers from backend for owned cards
    for (const c of purchased) {
      if (c.markedNumbers && c.markedNumbers.length > 0) {
        setMarkedNumbers(c.markedNumbers)
        break
      }
    }
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

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      setCountdownEnd(Date.now() + countdown * 1000)
      if (countdown <= 5 && countdown > 0) {
        sound.countdown()
      }
    }
  }, [countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  const [winnerCountdownEnd, setWinnerCountdownEnd] = useState<number | null>(null)

  useEffect(() => {
    if (winnerCountdownEnd === null) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((winnerCountdownEnd - Date.now()) / 1000))
      setWinnerCountdown(remaining)
      if (remaining <= 0) {
        setWinnerCountdownEnd(null)
        setShowWinnerModal(false)
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
  }, [winnerCountdown])

  const handleSelect = async (card: BingoCard) => {
    setLoading(true)
    setError('')
    try {
      await selectCard(id, card._id)
      try {
        await purchaseCardApi(id, card._id)
        sound.cardPurchased()
      } catch {
        await releaseCardApi(id, card._id).catch(() => {})
        throw new Error('Insufficient balance to purchase this card')
      }
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

  const toggleMark = async (num: number) => {
    if (!drawnNumbers.includes(num)) return
    const next = markedNumbers.includes(num)
      ? markedNumbers.filter((n) => n !== num)
      : [...markedNumbers, num]
    setMarkedNumbers(next)
    // Sync to backend
    const owned = myCards[0]
    if (owned) {
      try { await markNumberApi(id, owned._id, next) } catch { /* ignore */ }
    }
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/10">
            <span className="text-2xl animate-ball-spin">🎯</span>
          </div>
          <p className="text-purple-200/60 font-medium animate-pulse-soft">Loading game...</p>
        </div>
      </div>
    )
  }

  const isFinished = game.status === 'finished' || game.status === 'cancelled'
  const drawnNumbers = game.drawnNumbers || []
  const lastNumber = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null
  const lastThree = drawnNumbers.slice(-3)
  const gameWon = game.winner && user && game.winner.userId === user._id
  const drawProgress = (drawnNumbers.length / 75) * 100

  return (
    <div className="pb-24 animate-fade-in">
      <div className="p-3 max-w-lg mx-auto">
        {/* Connection + header */}
        <div className="flex items-center justify-between mb-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all hover:border-purple-200 active:scale-90 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-3 py-2 border border-gray-100/80 shadow-sm">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-gray-900">#{game.gameCode}</h1>
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-soft' : 'bg-rose-400'}`} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {game.status === 'starting' ? 'Starting' : game.status === 'active' ? 'Live' : game.status}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl px-4 py-2 border border-amber-200/50 shadow-sm text-right">
            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Prize Pool</div>
            <div className="text-lg font-extrabold text-amber-600 number-transition">
              {game.prizePool.toFixed(2)} <span className="text-xs font-semibold text-amber-400">Br</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50/90 backdrop-blur-sm text-rose-600 text-sm font-medium p-3 rounded-2xl mb-3 border border-rose-100 animate-slide-down flex items-center gap-2 shadow-sm">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="rounded-2xl p-5 bg-white/80 backdrop-blur-sm border border-gray-100 mb-3 text-center animate-scale-in relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/20 to-transparent" />
            {game.status === 'selection' ? (
              <>
                <div className="text-sm text-amber-500 font-bold mb-1 relative">Card selection ends in</div>
                <div className="text-5xl font-extrabold text-amber-500 relative animate-number-pop">
                  {Math.ceil(countdown)}
                </div>
                <div className="progress-bar mt-3 relative">
                  <div className="progress-bar-accent" style={{ width: `${(Math.ceil(countdown) / 30) * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-400 font-medium mb-1 relative">Game starting in</div>
                <div className="text-5xl font-extrabold text-purple-600 relative animate-number-pop">
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
            {/* Number calling hero section */}
            {lastNumber && (
              <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-600 via-purple-600 to-amber-500 mb-3 text-center relative overflow-hidden shadow-xl shadow-purple-200/30">
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Called number flash */}
                {calledNumberFlash && (
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-1 relative">
                    Last Number
                  </div>
                )}
                <div className="flex items-center justify-center gap-3 relative">
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1">
                    <span className="text-xs font-bold text-white/80">
                      #{drawnNumbers.length}/75
                    </span>
                  </div>
                  <div
                    className="text-6xl font-extrabold text-white relative animate-bounce-in"
                    style={{
                      textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {lastNumber}
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1">
                    <span className="text-xs font-bold text-white/80">
                      {COLUMNS[Math.floor((lastNumber - 1) / 15)]}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 relative">
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-1000 ease-linear"
                      style={{ width: `${drawProgress}%` }}
                    />
                  </div>
                </div>
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
                      const col = COLUMNS[Math.floor((n - 1) / 15)]
                      return (
                        <div
                          key={n}
                          className="text-center rounded-lg py-[5px] transition-colors duration-200"
                          style={{
                            fontSize: isCurrent ? '16px' : '11px',
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
                            boxShadow: isCurrent ? '0 4px 16px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
                            fontWeight: isCurrent ? 800 : isDrawn ? 700 : 500,
                            transform: isCurrent ? 'scale(1.1)' : 'none',
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
                      <div key={card._id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 border border-gray-100 shadow-sm animate-slide-up" style={{ animationDelay: `${ci * 0.1}s` }}>
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
                                  className="text-center font-bold rounded-lg transition-colors duration-150 active:scale-90"
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
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 text-center">
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

        {/* Finished state shows winner modal instead of inline */}
        {isFinished && !showWinnerModal && !winnerData && (
          <div className="mb-4 animate-fade-in">
            <div className="rounded-2xl p-6 bg-white/80 backdrop-blur-sm border border-gray-100 text-center shadow-sm">
              <div className="text-4xl mb-3 animate-wiggle">{game.status === 'cancelled' ? '🚫' : '📭'}</div>
              <div className="font-bold text-lg text-gray-900">
                Game {game.status === 'cancelled' ? 'Cancelled' : 'Finished'}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {game.status === 'cancelled' ? 'Refunds processed' : 'No winner'}
              </p>
              <button
                onClick={() => router.push('/')}
                className="btn-primary mt-4"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Winner Modal */}
      {showWinnerModal && winnerData && (
        <WinnerModal
          won={winnerData.won}
          prizeAmount={winnerData.prizeAmount}
          winnerCardData={winnerData.winnerCardData}
          winningLine={winnerData.winningLine}
          drawnNumbers={drawnNumbers}
          gameCode={game.gameCode}
          countdown={winnerCountdown ?? 0}
          onClose={() => setShowWinnerModal(false)}
        />
      )}

      <NavBar user={user} />
    </div>
  )
}
