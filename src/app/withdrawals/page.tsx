'use client'

import { useState, useEffect } from 'react'
import { getWithdrawals, createWithdrawalApi } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, Withdrawal } from '@/types'

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  processing: 'badge-blue',
  completed: 'badge-green',
  rejected: 'badge-red',
}

export default function WithdrawalsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      try {
        const data = await getWithdrawals()
        setWithdrawals(data)
      } catch {
        setError('Failed to load withdrawals')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  const handleSubmit = async () => {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!accountNumber.trim()) {
      setError('Enter account number')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await createWithdrawalApi({
        amount: amt,
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim() || undefined,
        accountName: accountName.trim() || undefined,
      })
      setAmount('')
      setAccountNumber('')
      setBankName('')
      setAccountName('')
      const data = await getWithdrawals()
      setWithdrawals(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit withdrawal')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="pb-16">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-6">Withdrawals</h1>

        <div className="card mb-6">
          <h3 className="font-bold mb-3">New Withdrawal</h3>
          {error && (
            <div className="bg-red-100 text-red-700 text-sm p-2 rounded-lg mb-3">{error}</div>
          )}
          <div className="space-y-3">
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              min="1"
              step="1"
            />
            <input
              type="text"
              placeholder="Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Bank Name (optional)"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Account Name (optional)"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="input"
            />
            <button
              onClick={handleSubmit}
              className="btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Withdrawal'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-3">Withdrawal History</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse h-16" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
              No withdrawals yet
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w._id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">${w.amount.toFixed(2)}</div>
                    <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      {w.accountNumber}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={statusBadge[w.status] || 'badge-gray'}>{w.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <NavBar user={user} />
    </div>
  )
}
