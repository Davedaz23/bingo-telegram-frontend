'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminGetDepositRequests, adminMatchSmsDeposit, adminConfirmDeposit } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, DepositRequest } from '@/types'

export default function AdminDepositsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [matchText, setMatchText] = useState<Record<string, string>>({})

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  const fetchDeposits = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminGetDepositRequests()
      setDeposits(data)
    } catch {
      setError('Failed to load deposit requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchDeposits()
  }, [user])

  const handleMatch = async (id: string) => {
    const adminSms = matchText[id]
    if (!adminSms?.trim()) {
      setError('Paste the admin SMS text first')
      return
    }
    setError('')
    try {
      await adminMatchSmsDeposit(id, adminSms.trim())
      setMatchText((prev) => ({ ...prev, [id]: '' }))
      await fetchDeposits()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to match SMS')
    }
  }

  const handleConfirm = async (id: string) => {
    setError('')
    try {
      await adminConfirmDeposit(id)
      await fetchDeposits()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm deposit')
    }
  }

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)' }}>
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-gray-900">Access Denied</h1>
          <Link href="/" className="btn-primary mt-4 inline-block">Go Home</Link>
        </div>
      </div>
    )
  }

  const pending = deposits.filter((d) => d.status === 'pending')

  return (
    <div className="pb-24 animate-fade-in">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4 animate-slide-up">
          <h1 className="text-2xl font-extrabold text-gray-900">Deposits</h1>
          <button onClick={fetchDeposits} className="btn-ghost text-sm active:scale-[0.97]" disabled={loading}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100">
            {error}
          </div>
        )}

        {deposits.length === 0 && !loading ? (
          <div className="text-center py-16 bg-white/60 rounded-2xl border border-gray-100 animate-scale-in">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 font-medium">No deposit requests found</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map((dep, i) => {
              const isPending = dep.status === 'pending'
              const isMatched = dep.status === 'sms_matched'
              return (
                <div key={dep._id} className="rounded-2xl p-5 bg-white border border-gray-100 animate-slide-up hover:shadow-md" style={{animationDelay: `${i * 0.05}s`}}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-sm font-extrabold text-purple-600">
                        {dep.userId?.firstName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900">{dep.userId?.firstName || 'Unknown'}</span>
                        {dep.userId?.username && (
                          <span className="ml-1 text-xs text-gray-400">@{dep.userId.username}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      dep.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      dep.status === 'sms_matched' ? 'bg-purple-50 text-purple-600' :
                      dep.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {dep.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div className="text-gray-400">Channel: <span className="font-semibold text-gray-700">{dep.channel}</span></div>
                    <div className="text-gray-400">Amount: <span className="font-semibold text-gray-700">{dep.amount.toFixed(2)} Br</span></div>
                    <div className="col-span-2 text-gray-400 text-xs">{new Date(dep.createdAt).toLocaleString()}</div>
                  </div>

                  {/* User SMS */}
                  <div className="mb-3">
                    <div className="text-xs font-bold text-gray-500 mb-1">User SMS:</div>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 break-all border border-gray-100">
                      {dep.userSmsText}
                    </div>
                  </div>

                  {/* Admin SMS (match) */}
                  {dep.adminSmsText && (
                    <div className="mb-3">
                      <div className="text-xs font-bold text-gray-500 mb-1">Admin SMS (match):</div>
                      <div className="bg-purple-50 rounded-xl p-3 text-sm text-gray-700 break-all border border-purple-100">
                        {dep.adminSmsText}
                      </div>
                    </div>
                  )}

                  {dep.matchedRef && (
                    <div className="mb-3 text-sm">
                      <span className="text-gray-400">Matched Ref: </span>
                      <span className="font-bold text-purple-600">{dep.matchedRef}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {isPending && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="text-xs font-bold text-gray-500 mb-2">Paste your SMS to match:</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Admin SMS text..."
                          value={matchText[dep._id] || ''}
                          onChange={(e) =>
                            setMatchText((prev) => ({ ...prev, [dep._id]: e.target.value }))
                          }
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={() => handleMatch(dep._id)}
                          className="btn-secondary whitespace-nowrap text-sm active:scale-[0.97]"
                        >
                          Match
                        </button>
                      </div>
                    </div>
                  )}

                  {(isMatched || isPending) && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <button
                        onClick={() => handleConfirm(dep._id)}
                        className="btn-primary w-full active:scale-[0.97]"
                      >
                        Confirm & Credit User
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
