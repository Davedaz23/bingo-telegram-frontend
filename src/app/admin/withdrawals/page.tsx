'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminGetWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, Withdrawal } from '@/types'

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  processing: 'badge-blue',
  completed: 'badge-green',
  rejected: 'badge-red',
}

export default function AdminWithdrawalsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  const fetchWithdrawals = async () => {
    try {
      const data = await adminGetWithdrawals()
      setWithdrawals(data)
    } catch {
      setError('Failed to load withdrawals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchWithdrawals()
  }, [user])

  const handleApprove = async (id: string) => {
    setActionLoading(`approve-${id}`)
    setError('')
    try {
      await adminApproveWithdrawal(id)
      await fetchWithdrawals()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setActionLoading('')
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(`reject-${id}`)
    setError('')
    try {
      await adminRejectWithdrawal(id)
      await fetchWithdrawals()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject')
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
        <h1 className="text-xl font-bold mb-6">Withdrawals ({withdrawals.length})</h1>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse h-20" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--tg-theme-hint-color)' }}>
            No withdrawals yet
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div key={w._id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">{w.amount.toFixed(2)} Birr</div>
                  <span className={statusBadge[w.status] || 'badge-gray'}>{w.status}</span>
                </div>
                <div className="text-xs space-y-0.5" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  <div>Account: {w.accountNumber}</div>
                  {w.bankName && <div>Bank: {w.bankName}</div>}
                  {w.accountName && <div>Name: {w.accountName}</div>}
                  <div>Requested: {new Date(w.createdAt).toLocaleString()}</div>
                </div>
                {w.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(w._id)}
                      className="btn-success text-xs flex-1 py-2"
                      disabled={actionLoading === `approve-${w._id}` || actionLoading === `reject-${w._id}`}
                    >
                      {actionLoading === `approve-${w._id}` ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(w._id)}
                      className="btn-danger text-xs flex-1 py-2"
                      disabled={actionLoading === `reject-${w._id}` || actionLoading === `approve-${w._id}`}
                    >
                      {actionLoading === `reject-${w._id}` ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
                {w.remark && (
                  <div className="text-xs mt-2 italic" style={{ color: 'var(--tg-theme-hint-color)' }}>
                    Remark: {w.remark}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
