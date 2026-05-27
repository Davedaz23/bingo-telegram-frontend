'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAdminDashboardData } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, AdminDashboard } from '@/types'

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      try {
        const data = await getAdminDashboardData()
        setDashboard(data)
      } catch {
        setError('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Admin access required
          </p>
          <Link href="/" className="btn-primary mt-4 inline-block">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <span className="badge-blue">{user.role}</span>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="card animate-pulse h-20" />
            <div className="card animate-pulse h-20" />
          </div>
        ) : dashboard ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
                  {dashboard.stats.users.total}
                </div>
                <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Users</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
                  {dashboard.stats.games.active}
                </div>
                <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Active Games</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {dashboard.stats.pendingWithdrawals}
                </div>
                <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Pending Withdrawals</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {dashboard.stats.pendingDeposits ?? 0}
                </div>
                <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Pending Deposits</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-green-500">
                  ${dashboard.stats.platformRevenue.toFixed(2)}
                </div>
                <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Revenue</div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <Link href="/admin/games" className="card flex items-center justify-between hover:opacity-80 transition-opacity">
                <span className="font-medium">🎮 Games</span>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Create & manage →</span>
              </Link>
              <Link href="/admin/users" className="card flex items-center justify-between hover:opacity-80 transition-opacity">
                <span className="font-medium">👥 Users</span>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Manage users →</span>
              </Link>
              <Link href="/admin/deposits" className="card flex items-center justify-between hover:opacity-80 transition-opacity">
                <span className="font-medium">💰 Deposits</span>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Match & confirm →</span>
              </Link>
              <Link href="/admin/withdrawals" className="card flex items-center justify-between hover:opacity-80 transition-opacity">
                <span className="font-medium">💳 Withdrawals</span>
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Approve/reject →</span>
              </Link>
            </div>

            {dashboard.recentTransactions.length > 0 && (
              <div>
                <h3 className="font-bold mb-3">Recent Transactions</h3>
                <div className="space-y-2">
                  {dashboard.recentTransactions.slice(0, 5).map((tx) => (
                    <div key={tx._id} className="card flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{tx.type}</div>
                        <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${tx.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
      <NavBar user={user} />
    </div>
  )
}
