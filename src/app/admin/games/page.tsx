'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getGames, adminCreateGame, adminStartGame, adminCancelGame } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, Game } from '@/types'

export default function AdminGamesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

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

  useEffect(() => {
    if (!user) return
    fetchGames()
  }, [user])

  const handleCreate = async () => {
    setActionLoading('create')
    setError('')
    try {
      await adminCreateGame()
      await fetchGames()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setActionLoading('')
    }
  }

  const handleStart = async (id: string) => {
    setActionLoading(`start-${id}`)
    setError('')
    try {
      await adminStartGame(id)
      await fetchGames()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setActionLoading('')
    }
  }

  const handleCancel = async (id: string) => {
    setActionLoading(`cancel-${id}`)
    setError('')
    try {
      await adminCancelGame(id)
      await fetchGames()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel game')
    } finally {
      setActionLoading('')
    }
  }

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <Link href="/" className="btn-primary mt-4 inline-block">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Games</h1>
          <button
            onClick={handleCreate}
            className="btn-primary"
            disabled={actionLoading === 'create'}
          >
            {actionLoading === 'create' ? 'Creating...' : '+ New Game'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse h-20" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--tg-theme-hint-color)' }}>
            <p>No games yet</p>
            <p className="text-xs mt-1">Click &quot;+ New Game&quot; to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <div key={game._id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold">#{game.gameCode}</span>
                    <span className={`ml-2 ${game.status === 'waiting' ? 'badge-blue' : game.status === 'starting' ? 'badge-yellow' : game.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {game.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {game.status === 'waiting' && (
                      <button
                        onClick={() => handleStart(game._id)}
                        className="btn-success text-xs px-2 py-1"
                        disabled={actionLoading === `start-${game._id}`}
                      >
                        Start
                      </button>
                    )}
                    {(game.status === 'waiting' || game.status === 'starting') && (
                      <button
                        onClick={() => handleCancel(game._id)}
                        className="btn-danger text-xs px-2 py-1"
                        disabled={actionLoading === `cancel-${game._id}`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  <span>🎯 ${game.prizePool.toFixed(2)}</span>
                  <span>👥 {game.players?.length ?? 0}</span>
                  <span>🎴 {game.purchasedCards ?? '?'}/{game.totalCards ?? '?'}</span>
                  <Link href={`/games/${game._id}`} className="underline">View →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
