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
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <Link href="/" className="btn-primary mt-4 inline-block">Go Home</Link>
        </div>
      </div>
    )
  }

  const pending = deposits.filter((d) => d.status === 'pending')

  return (
    <div className="pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Deposits</h1>
          <button onClick={fetchDeposits} className="btn-secondary" disabled={loading}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>
        )}

        {deposits.length === 0 && !loading ? (
          <div className="text-center py-8" style={{ color: '#7fbcb4' }}>
            No deposit requests found
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map((dep) => {
              const isPending = dep.status === 'pending'
              const isMatched = dep.status === 'sms_matched'
              return (
                <div key={dep._id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-lg">{dep.userId?.firstName || 'Unknown'}</span>
                      {dep.userId?.username && (
                        <span className="ml-1" style={{ color: '#7fbcb4' }}>
                          @{dep.userId.username}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ fontSize: '12px' }}>
                      {dep.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2" style={{ color: '#7fbcb4' }}>
                    <div>Channel: <span className="font-medium" style={{ color: '#1a1a2e' }}>{dep.channel}</span></div>
                    <div>Amount: <span className="font-medium" style={{ color: '#1a1a2e' }}>{dep.amount.toFixed(2)} Birr</span></div>
                    <div className="col-span-2">Date: {new Date(dep.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="mb-2">
                    <div className="font-medium mb-0.5">User SMS:</div>
                    <div className="bg-gray-50 p-2 rounded break-all">{dep.userSmsText}</div>
                  </div>

                  {dep.adminSmsText && (
                    <div className="mb-2">
                      <div className="font-medium mb-0.5">Admin SMS (match):</div>
                      <div className="bg-gray-50 p-2 rounded break-all">{dep.adminSmsText}</div>
                    </div>
                  )}

                  {dep.matchedRef && (
                    <div className="mb-2">
                      Matched Ref: <span className="font-medium">{dep.matchedRef}</span>
                    </div>
                  )}

                  {isPending && (
                    <div className="border-t pt-2 mt-2">
                      <div className="font-medium mb-1">Paste your SMS to match:</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Admin SMS text..."
                          value={matchText[dep._id] || ''}
                          onChange={(e) =>
                            setMatchText((prev) => ({ ...prev, [dep._id]: e.target.value }))
                          }
                          className="input flex-1"
                        />
                        <button
                          onClick={() => handleMatch(dep._id)}
                          className="btn-secondary whitespace-nowrap"
                        >
                          Match
                        </button>
                      </div>
                    </div>
                  )}

                  {(isMatched || isPending) && (
                    <div className="border-t pt-2 mt-2">
                      <button
                        onClick={() => handleConfirm(dep._id)}
                        className="btn-primary w-full"
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
