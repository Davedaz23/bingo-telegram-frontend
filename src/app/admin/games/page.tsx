'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getGames, adminCreateGame, adminStartGame, adminCancelGame } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/roles'
import NavBar from '@/components/NavBar'
import type { User, Game } from '@/types'

export default function AdminGamesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    validateTelegramSession()
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

  const isAdmin = hasAdminAccess(user.role)
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-extrabold text-gray-900">Access Denied</h1>
          <Link href="/" className="btn-primary mt-4 inline-block">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 animate-fade-in">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <h1 className="text-2xl font-extrabold text-gray-900">Games</h1>
          <button
            onClick={handleCreate}
            className="btn-primary text-sm active:scale-[0.97]"
            disabled={actionLoading === 'create'}
          >
            {actionLoading === 'create' ? 'Creating...' : '+ New Game'}
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100 animate-slide-up">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-2xl border border-gray-100 animate-scale-in">
            <div className="text-4xl mb-3">🎲</div>
            <p className="text-gray-400 font-medium">No games yet</p>
            <p className="text-sm text-gray-300 mt-1">Click &quot;+ New Game&quot; to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game, i) => (
              <div key={game._id} className="rounded-2xl p-4 bg-white border border-gray-100 animate-slide-up hover:shadow-md hover:-translate-y-0.5" style={{animationDelay: `${i * 0.05}s`}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-purple-200">
                      #{game.gameCode}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">#{game.gameCode}</span>
                      <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        game.status === 'selection' ? 'bg-purple-50 text-purple-600' :
                        game.status === 'starting' ? 'bg-amber-50 text-amber-600' :
                        game.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                        game.status === 'finished' ? 'bg-gray-50 text-gray-500' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {game.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {game.status === 'selection' && (
                      <button
                        onClick={() => handleStart(game._id)}
                        className="btn-success text-xs px-3 py-1.5 active:scale-[0.97]"
                        disabled={actionLoading === `start-${game._id}`}
                      >
                        Start
                      </button>
                    )}
                    {(game.status === 'selection' || game.status === 'starting') && (
                      <button
                        onClick={() => handleCancel(game._id)}
                        className="btn-danger text-xs px-3 py-1.5 active:scale-[0.97]"
                        disabled={actionLoading === `cancel-${game._id}`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>🎯 <strong className="text-gray-700">{game.prizePool.toFixed(2)} Birr</strong></span>
                  <span>🎴 <strong className="text-gray-700">{game.purchasedCards ?? '?'}</strong> sold</span>
                  <span>🔢 <strong className="text-gray-700">{game.drawnNumbers?.length ?? 0}</strong> drawn</span>
                  <Link href={`/games/${game._id}`} className="text-purple-500 font-semibold hover:underline">View →</Link>
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
