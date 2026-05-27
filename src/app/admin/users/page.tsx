'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminGetUsers, adminBanUser, adminCreditUser } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [creditModal, setCreditModal] = useState<{ id: string; name: string } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await adminGetUsers()
      setUsers(data)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchUsers()
  }, [user])

  const handleBan = async (id: string) => {
    setActionLoading(`ban-${id}`)
    setError('')
    try {
      await adminBanUser(id)
      await fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to ban user')
    } finally {
      setActionLoading('')
    }
  }

  const handleCredit = async () => {
    if (!creditModal) return
    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount')
      return
    }
    setActionLoading(`credit-${creditModal.id}`)
    setError('')
    try {
      await adminCreditUser(creditModal.id, amount)
      setCreditModal(null)
      setCreditAmount('')
      await fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to credit user')
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
          <h1 className="text-xl font-bold">Users ({users.length})</h1>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse h-16" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u._id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {u.firstName} {u.lastName || ''}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      @{u.username || 'no username'} · ID: {u.telegramId}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${u.isActive ? 'text-green-500' : 'text-red-500'}`}>
                        {u.isActive ? 'Active' : 'Banned'}
                      </span>
                      <span className="badge-blue text-xs">{u.role}</span>
                      <span className="text-xs font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
                        {u.balance.toFixed(2)} Birr
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => setCreditModal({ id: u._id, name: u.firstName })}
                      className="btn-primary text-xs px-2 py-1"
                      disabled={actionLoading === `credit-${u._id}`}
                    >
                      Credit
                    </button>
                    {u.isActive && (
                      <button
                        onClick={() => handleBan(u._id)}
                        className="btn-danger text-xs px-2 py-1"
                        disabled={actionLoading === `ban-${u._id}`}
                      >
                        Ban
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {creditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
            <h3 className="font-bold mb-1">Credit {creditModal.name}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Enter amount to add to wallet
            </p>
            <input
              type="number"
              placeholder="Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="input mb-4"
              autoFocus
              min="1"
            />
            <div className="flex gap-3">
              <button onClick={() => { setCreditModal(null); setCreditAmount('') }} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleCredit} className="btn-primary flex-1" disabled={!creditAmount}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar user={user} />
    </div>
  )
}
