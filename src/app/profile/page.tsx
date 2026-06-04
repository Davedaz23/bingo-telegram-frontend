'use client'

import { useState, useEffect } from 'react'
import { getProfile } from '@/lib/api'
import { getStoredUser, clearAuth, validateTelegramSession } from '@/lib/auth'
import { disconnectSocket } from '@/lib/socket'
import NavBar from '@/components/NavBar'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      try {
        const p = await getProfile()
        setProfile(p)
      } catch {
        // use cached user
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  const handleLogout = () => {
    clearAuth()
    disconnectSocket()
    router.push('/')
  }

  const p = profile || user

  if (!p) return null

  return (
    <div className="pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Profile</h1>

        {/* Profile card */}
        <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-3xl font-extrabold mx-auto mb-4 text-white shadow-xl shadow-purple-200">
            {p.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="font-extrabold text-xl text-gray-900">
            {p.firstName} {p.lastName || ''}
          </div>
          {p.username && (
            <div className="text-sm text-gray-400">
              @{p.username}
            </div>
          )}
          <div className="mt-3">
            <span className="badge-primary capitalize text-xs">{p.role}</span>
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-6">
          <h3 className="font-extrabold text-gray-900 mb-4">Account Info</h3>
          <div className="space-y-3">
            {[
              { label: 'Telegram ID', value: p.telegramId },
              { label: 'Balance', value: `${p.balance.toFixed(2)} Birr`, accent: true },
              { label: 'Language', value: p.languageCode },
              { label: 'Joined', value: new Date(p.createdAt).toLocaleDateString() },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-400">{item.label}</span>
                <span className={`font-bold text-sm ${item.accent ? 'text-purple-600' : 'text-gray-900'}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="skeleton h-24 mb-6" />
        )}

        <button onClick={handleLogout} className="btn-danger w-full">
          Logout
        </button>
      </div>
      <NavBar user={p} />
    </div>
  )
}
