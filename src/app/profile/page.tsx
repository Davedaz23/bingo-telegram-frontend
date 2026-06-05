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
    <div className="pb-24 animate-fade-in">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 animate-slide-up">Profile</h1>

        {/* Profile card */}
        <div className="rounded-2xl p-6 bg-white border border-gray-100 text-center mb-6 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50/50 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-3xl font-extrabold mx-auto mb-4 text-white shadow-xl shadow-purple-200 animate-float">
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
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="badge-primary capitalize text-xs">{p.role}</span>
              <span className={`badge text-xs ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                {p.isActive ? 'Active' : 'Banned'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats mini cards */}
        <div className="grid grid-cols-3 gap-2 mb-6 animate-slide-up" style={{animationDelay:'0.1s'}}>
          {[
            { label: 'Balance', value: `${p.balance.toFixed(0)}`, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Language', value: p.languageCode.toUpperCase(), color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Joined', value: new Date(p.createdAt).toLocaleDateString().slice(0,5), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-3 text-center`}>
              <div className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Account info */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-6 animate-slide-up" style={{animationDelay:'0.15s'}}>
          <h3 className="font-extrabold text-gray-900 mb-4">Account Info</h3>
          <div className="space-y-3">
            {[
              { label: 'Telegram ID', value: p.telegramId, icon: '🆔' },
              { label: 'Balance', value: `${p.balance.toFixed(2)} Birr`, accent: true, icon: '💰' },
              { label: 'Language', value: p.languageCode, icon: '🌐' },
              { label: 'Joined', value: new Date(p.createdAt).toLocaleDateString(), icon: '📅' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <span>{item.icon}</span> {item.label}
                </span>
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

        <button onClick={handleLogout} className="btn-danger w-full active:scale-[0.97]">
          Logout
        </button>
      </div>
      <NavBar user={p} />
    </div>
  )
}
