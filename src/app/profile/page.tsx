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
    <div className="pb-16">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>

        <div className="card text-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3 text-white"
            style={{ backgroundColor: '#0ca3db' }}
          >
            {p.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="font-bold text-xl">
            {p.firstName} {p.lastName || ''}
          </div>
          {p.username && (
            <div style={{ color: '#ffffff' }}>
              @{p.username}
            </div>
          )}
          <div className="mt-2">
            <span className="badge-blue capitalize">{p.role}</span>
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="font-bold mb-3 text-lg">Account Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span style={{ color: '#ffffff' }}>Telegram ID</span>
              <span>{p.telegramId}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#ffffff' }}>Balance</span>
              <span className="font-bold" style={{ color: '#0ca3db' }}>
                {p.balance.toFixed(2)} Birr
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#ffffff' }}>Language</span>
              <span>{p.languageCode}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#ffffff' }}>Joined</span>
              <span>{new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="card animate-pulse h-24 mb-6" />
        )}

        <button onClick={handleLogout} className="btn-danger w-full">
          Logout
        </button>
      </div>
      <NavBar user={p} />
    </div>
  )
}
