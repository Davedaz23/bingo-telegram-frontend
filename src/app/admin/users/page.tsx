'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminGetUsers, adminBanUser, adminCreditUser, adminDeleteUser } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/roles'
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
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    validateTelegramSession()
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

  const handleDelete = async () => {
    if (!deleteModal) return
    setActionLoading(`delete-${deleteModal.id}`)
    setError('')
    try {
      await adminDeleteUser(deleteModal.id)
      setDeleteModal(null)
      await fetchUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
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
          <h1 className="text-2xl font-extrabold text-gray-900">Users ({users.length})</h1>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100 animate-slide-up">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u, i) => (
              <div key={u._id} className="rounded-2xl p-4 bg-white border border-gray-100 animate-slide-up hover:shadow-md hover:-translate-y-0.5" style={{animationDelay: `${i * 0.05}s`}}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0">
                        {u.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-gray-900">{u.firstName} {u.lastName || ''}</span>
                        <span className="ml-2 text-xs text-gray-400">@{u.username || 'no username'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 ml-10">
                      <span className={`text-xs font-semibold ${u.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {u.isActive ? 'Active' : 'Banned'}
                      </span>
                      <span className="badge-primary text-[10px]">{u.role}</span>
                      <span className="text-xs font-bold text-purple-600">{u.balance.toFixed(2)} Birr</span>
                    </div>
                  </div>
                    <div className="flex gap-1.5 ml-2 flex-shrink-0">
                      <button
                        onClick={() => setCreditModal({ id: u._id, name: u.firstName })}
                        className="btn-primary text-xs px-3 py-1.5 active:scale-[0.97]"
                        disabled={actionLoading === `credit-${u._id}`}
                      >
                        Credit
                      </button>
                      {u.isActive && (
                        <button
                        onClick={() => handleBan(u._id)}
                        className="btn-danger text-xs px-3 py-1.5 active:scale-[0.97]"
                        disabled={actionLoading === `ban-${u._id}`}
                        >
                          Ban
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteModal({ id: u._id, name: u.firstName })}
                        className="btn-danger text-xs px-3 py-1.5 active:scale-[0.97]"
                        disabled={actionLoading === `delete-${u._id}`}
                      >
                        Delete
                      </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit Modal */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl p-6 w-full max-w-sm bg-white shadow-2xl border border-gray-100 animate-slide-up hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-extrabold text-gray-900 text-center mb-1">Credit {creditModal.name}</h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              Enter amount to add to wallet
            </p>
            <input
              type="number"
              placeholder="Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="input mb-5"
              autoFocus
              min="1"
            />
            <div className="flex gap-3">
              <button onClick={() => { setCreditModal(null); setCreditAmount('') }} className="btn-ghost flex-1 border-2 border-gray-100">
                Cancel
              </button>
              <button onClick={handleCredit} className="btn-primary flex-1" disabled={!creditAmount}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl p-6 w-full max-w-sm bg-white shadow-2xl border border-gray-100 animate-slide-up hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="font-extrabold text-gray-900 text-center mb-1">Delete {deleteModal.name}?</h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              This will permanently delete the user and all their data (cards, transactions, games). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn-ghost flex-1 border-2 border-gray-100">
                Cancel
              </button>
              <button onClick={handleDelete} className="btn-danger flex-1" disabled={actionLoading.startsWith('delete-')}>
                {actionLoading.startsWith('delete-') ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar user={user} />
    </div>
  )
}
