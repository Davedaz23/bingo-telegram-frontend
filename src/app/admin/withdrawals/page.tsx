'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminGetWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/roles'
import NavBar from '@/components/NavBar'
import type { User, Withdrawal } from '@/types'

const statusBadge: Record<string, string> = {
  pending: 'badge-accent',
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
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 animate-slide-up">Withdrawals ({withdrawals.length})</h1>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-16 bg-white/60 rounded-2xl border border-gray-100 animate-scale-in">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 font-medium">No withdrawals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w, i) => (
              <div key={w._id} className="rounded-2xl p-4 bg-white border border-gray-100 animate-slide-up hover:shadow-md hover:-translate-y-0.5" style={{animationDelay: `${i * 0.05}s`}}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-extrabold text-lg text-gray-900">{w.amount.toFixed(2)} Birr</div>
                  <span className={statusBadge[w.status] || 'badge-gray'}>{w.status}</span>
                </div>
                <div className="space-y-0.5 text-xs text-gray-400 mb-3">
                  <div>Account: <span className="font-medium text-gray-700">{w.accountNumber}</span></div>
                  {w.bankName && <div>Bank: <span className="font-medium text-gray-700">{w.bankName}</span></div>}
                  {w.accountName && <div>Name: <span className="font-medium text-gray-700">{w.accountName}</span></div>}
                  <div>Date: {new Date(w.createdAt).toLocaleString()}</div>
                </div>
                {w.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(w._id)}
                      className="btn-success flex-1 text-sm active:scale-[0.97]"
                      disabled={actionLoading === `approve-${w._id}` || actionLoading === `reject-${w._id}`}
                    >
                      {actionLoading === `approve-${w._id}` ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(w._id)}
                      className="btn-danger flex-1 text-sm active:scale-[0.97]"
                      disabled={actionLoading === `reject-${w._id}` || actionLoading === `approve-${w._id}`}
                    >
                      {actionLoading === `reject-${w._id}` ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
                {w.remark && (
                  <div className="mt-2 text-xs text-gray-400 italic">
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
