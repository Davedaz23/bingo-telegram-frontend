'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getWelcomeBonusSetting, setWelcomeBonusSetting } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/roles'
import NavBar from '@/components/NavBar'
import type { User } from '@/types'

export default function AdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      try {
        const val = await getWelcomeBonusSetting()
        setBonusAmount(String(val))
      } catch {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [user])

  const handleSave = async () => {
    const amount = parseFloat(bonusAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive number')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const newVal = await setWelcomeBonusSetting(amount)
      setBonusAmount(String(newVal))
      setSuccess(`Welcome bonus updated to ${newVal} Birr`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const isAdmin = hasAdminAccess(user.role)
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
    <div className="pb-24 animate-fade-in">
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6 animate-slide-up">
          <Link href="/admin" className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-sm hover:bg-gray-200 transition-colors">
            ←
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-emerald-100">
            {success}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-20" />
            <div className="skeleton h-12" />
          </div>
        ) : (
          <div className="rounded-2xl p-5 bg-white border border-gray-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-lg">🎁</div>
              <div>
                <div className="font-bold text-gray-900">Welcome Bonus</div>
                <div className="text-xs text-gray-400">Amount credited to new players on registration</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                step="1"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                className="input flex-1 text-lg font-bold"
                placeholder="Enter amount"
              />
              <span className="text-sm font-semibold text-gray-400">Birr</span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full mt-4"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <NavBar user={user} />
    </div>
  )
}
