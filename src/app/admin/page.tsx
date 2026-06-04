'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAdminDashboardData } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import type { User, AdminDashboard } from '@/types'

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
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
      <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F3FF 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-400 mt-2">Admin access required</p>
          <Link href="/" className="btn-primary mt-4 inline-block">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Admin Panel</h1>
          <span className="badge-primary text-xs">{user.role}</span>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
          </div>
        ) : dashboard ? (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Users', value: dashboard.stats.users.total, color: 'text-purple-600' },
                { label: 'Active Games', value: dashboard.stats.games.active, color: 'text-emerald-600' },
                { label: 'Pending W/Drawals', value: dashboard.stats.pendingWithdrawals, color: 'text-amber-600' },
                { label: 'Pending Deposits', value: dashboard.stats.pendingDeposits ?? 0, color: 'text-amber-600' },
                { label: 'Revenue', value: `${dashboard.stats.platformRevenue.toFixed(2)} Br`, color: 'text-purple-600', span: true },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl p-4 bg-white border border-gray-100 text-center ${stat.span ? 'col-span-2' : ''}`}
                >
                  <div className={`text-2xl font-extrabold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Navigation links */}
            <div className="space-y-2 mb-6">
              {[
                { href: '/admin/games', label: 'Games', icon: '🎮', desc: 'Create & manage' },
                { href: '/admin/users', label: 'Users', icon: '👥', desc: 'Manage users' },
                { href: '/admin/deposits', label: 'Deposits', icon: '💰', desc: 'Match & confirm' },
                { href: '/admin/withdrawals', label: 'Withdrawals', icon: '💳', desc: 'Approve/reject' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-2xl p-4 bg-white border border-gray-100 transition-all hover:border-purple-200 hover:shadow-md hover:shadow-purple-100/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-lg">
                      {link.icon}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{link.label}</div>
                      <div className="text-xs text-gray-400">{link.desc}</div>
                    </div>
                  </div>
                  <span className="text-gray-300 text-lg">→</span>
                </Link>
              ))}
            </div>

            {/* Recent transactions */}
            {dashboard.recentTransactions.length > 0 && (
              <div>
                <h3 className="font-extrabold text-gray-900 mb-3 text-lg">Recent Transactions</h3>
                <div className="space-y-2">
                  {dashboard.recentTransactions.slice(0, 5).map((tx) => (
                    <div key={tx._id} className="rounded-2xl p-4 bg-white border border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{tx.type}</div>
                        <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                      <div className={`font-extrabold ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.amount.toFixed(2)} Br
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
