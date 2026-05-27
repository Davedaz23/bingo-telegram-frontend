'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  getGame,
  getGameCards,
  selectCard,
  releaseCardApi,
  purchaseCardApi,
  claimBingoApi,
} from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { useSocket } from '@/hooks/useSocket'
import { joinGameRoom, leaveGameRoom } from '@/lib/socket'
import NavBar from '@/components/NavBar'
import CardSelector from '@/components/CardSelector'
import BingoBoard from '@/components/BingoBoard'
import type { User, Game, BingoCard } from '@/types'

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [cards, setCards] = useState<BingoCard[]>([])
  const [myCards, setMyCards] = useState<BingoCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [placedBingo, setPlacedBingo] = useState(false)
  const { on } = useSocket()

  useEffect(() => {
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
    }))

    unsubs.push(on('game:cancelled', () => {
      fetchGame()
    }))

    unsubs.push(on('card:purchased', () => {
      fetchCards()
    }))

    unsubs.push(on('card:locked', () => {
      fetchCards()
    }))

    unsubs.push(on('card:released', () => {
      fetchCards()
    }))

    return () => { unsubs.forEach((fn) => fn()) }
  }, [on, fetchGame, fetchCards])

  useEffect(() => {
    if (!game || !user) return
    const purchased = cards.filter(
      (c) => c.status === 'purchased' && (c.ownerId === user._id || c.isLockedByMe)
    )
    setMyCards(purchased)
  }, [cards, game, user])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleSelect = async (card: BingoCard) => {
    setLoading(true)
    setError('')
    try {
      const result = await selectCard(id, card._id)
      setSelectedCardId(card._id)
      if (result.card) {
        setCards((prev) => prev.map((c) =>
          c._id === card._id ? { ...c, ...result.card, status: 'selected' } : c
        ))
      }
      await fetchCards()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to select card')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (card: BingoCard) => {
    setLoading(true)
    setError('')
    try {
      await purchaseCardApi(id, card._id)
      setSelectedCardId(null)
      await fetchCards()
      await fetchGame()
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
      setSelectedCardId(null)
      await fetchCards()
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
        <div className="animate-pulse text-center" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Loading game...
        </div>
      </div>
    )
  }

  const isFinished = game.status === 'finished' || game.status === 'cancelled'

  return (
    <div className="pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Game #{game.gameCode}</h1>
            <p className="text-sm capitalize" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Status: {game.status}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>Prize Pool</div>
            <div className="text-lg font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
              ${game.prizePool.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="card mb-4 flex justify-between text-sm">
          <span>🎴 {game.purchasedCards ?? cards.filter(c => c.status === 'purchased').length ?? 0} cards sold</span>
          <span>🔢 Drawn: {game.drawnNumbers.length}/75</span>
          <span>💰 ${game.prizePool.toFixed(2)}</span>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {countdown !== null && countdown > 0 && game.status === 'starting' && (
          <div className="card mb-4 text-center">
            <div className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>Game starting in</div>
            <div className="text-3xl font-bold mt-1" style={{ color: 'var(--tg-theme-button-color)' }}>
              {Math.ceil(countdown)}s
            </div>
          </div>
        )}

        {game.status === 'active' && (
          <div className="mb-4">
            <div className="card mb-3">
              <div className="flex flex-wrap gap-1 mb-2">
                <div className="text-sm font-medium mb-1 w-full">Drawn Numbers ({game.drawnNumbers.length}/75)</div>
                {game.drawnNumbers.length === 0 ? (
                  <span className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Waiting for first draw...</span>
                ) : (
                  game.drawnNumbers.map((n, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: 'var(--tg-theme-button-color)' }}
                    >
                      {n}
                    </span>
                  ))
                )}
              </div>
            </div>

            {myCards.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-bold">My Cards</h3>
                {myCards.map((card) => (
                  <div key={card._id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Card #{card.cardNumber}</span>
                      <button
                        onClick={handleBingo}
                        className="btn-primary text-sm"
                        disabled={loading || placedBingo}
                      >
                        {placedBingo ? 'BINGO Claimed!' : loading ? '...' : 'BINGO!'}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      {card.card ? (
                        <BingoBoard card={card.card} drawnNumbers={game.drawnNumbers} />
                      ) : (
                        <div className="text-sm py-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
                          Card data not available
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
                You haven&apos;t purchased any cards for this game
              </div>
            )}
          </div>
        )}

        {game.status === 'selection' && (
          <CardSelector
            cards={cards}
            selectedCardId={selectedCardId}
            onSelect={handleSelect}
            onPurchase={handlePurchase}
            onRelease={handleRelease}
            loading={loading}
          />
        )}

        {isFinished && (
          <div className="card text-center mb-4">
            {game.winner && user && game.winner.userId === user._id ? (
              <div>
                <div className="text-3xl mb-2">🎉</div>
                <div className="font-bold text-lg text-green-500">You Won!</div>
                <div className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  Prize: ${game.winner.prizeAmount?.toFixed(2)}
                </div>
              </div>
            ) : game.winner ? (
              <div>
                <div className="text-sm font-medium">Game Won</div>
                <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  Another player won this game
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium">Game {game.status === 'cancelled' ? 'Cancelled' : 'Finished'}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  {game.status === 'cancelled' ? 'Refunds have been processed' : 'No winner'}
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
