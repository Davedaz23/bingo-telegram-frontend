'use client'

import { useState, useEffect } from 'react'
import { getWithdrawals, createWithdrawalApi } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, Withdrawal } from '@/types'

const statusBadge: Record<string, string> = {
  pending: 'badge-accent',
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
    validateTelegramSession()
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
    <div className="pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Withdrawals</h1>

        {/* New withdrawal */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-6">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">💸</span> New Withdrawal
          </h3>
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                min="1"
                step="1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Account Number</label>
              <input
                type="text"
                placeholder="e.g. 1000134567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Bank (optional)</label>
                <input
                  type="text"
                  placeholder="Bank name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Name (optional)</label>
                <input
                  type="text"
                  placeholder="Account name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="btn-primary w-full mt-2"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Withdrawal'}
            </button>
          </div>
        </div>

        {/* Withdrawal history */}
        <div>
          <h3 className="font-extrabold text-gray-900 mb-4 text-lg">Withdrawal History</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[72px]" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400 font-medium">No withdrawals yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div
                  key={w._id}
                  className="rounded-2xl p-4 bg-white border border-gray-100 flex items-center justify-between transition-all hover:border-gray-200"
                >
                  <div>
                    <div className="font-extrabold text-gray-900">{w.amount.toFixed(2)} Birr</div>
                    <div className="text-xs text-gray-400 mt-0.5">{w.accountNumber}</div>
                    <div className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleDateString()}</div>
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
