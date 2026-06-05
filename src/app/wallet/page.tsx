'use client'

import { useState, useEffect } from 'react'
import { getBalance, getDepositAccounts, requestSmsDeposit, getTransactions } from '@/lib/api'
import { getStoredUser, validateTelegramSession } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TransactionList from '@/components/TransactionList'
import type { User, Transaction, DepositAccounts } from '@/types'

const CHANNELS = ['cbe', 'cbebirr', 'abyssinia', 'telebirr'] as const
const CHANNEL_LABELS: Record<string, string> = {
  cbe: 'CBE',
  cbebirr: 'CBE Birr',
  abyssinia: 'Abyssinia',
  telebirr: 'Telebirr',
}

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<DepositAccounts | null>(null)
  const [channel, setChannel] = useState<string>('')
  const [smsText, setSmsText] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    validateTelegramSession()
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const [bal, txs, accs] = await Promise.all([
          getBalance(),
          getTransactions(),
          getDepositAccounts(),
        ])
        setBalance(bal)
        setTransactions(txs)
        setAccounts(accs)
      } catch {
        setError('Failed to load wallet data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const handleDeposit = async () => {
    if (!channel) {
      setError('Select a deposit channel')
      return
    }
    if (!smsText.trim()) {
      setError('Paste the SMS confirmation you received')
      return
    }
    setDepositing(true)
    setError('')
    setSuccess('')
    try {
      await requestSmsDeposit(0, channel, smsText.trim())
      setSuccess('Deposit request submitted. Wait for admin confirmation.')
      setSmsText('')
      setChannel('')
      const bal = await getBalance()
      setBalance(bal)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deposit failed')
    } finally {
      setDepositing(false)
    }
  }

  if (!user) return null

  return (
    <div className="pb-24 animate-fade-in">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 animate-slide-up">Wallet</h1>

        {/* Balance card */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white mb-6 shadow-2xl shadow-purple-200 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm text-purple-200 font-medium">Available Balance</div>
              <div className="bg-white/15 rounded-full px-2 py-0.5 text-[10px] font-semibold text-purple-100">
                Birr
              </div>
            </div>
            <div className="text-4xl font-extrabold number-transition">
              {balance.toFixed(2)}
            </div>
            <div className="mt-4 flex gap-2">
              <div className="bg-white/15 rounded-xl px-3 py-1.5 text-xs font-medium text-purple-100 backdrop-blur-sm">
                Wallet
              </div>
            </div>
          </div>
        </div>

        {/* Deposit section */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-6 animate-slide-up" style={{animationDelay:'0.1s'}}>
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">📥</span> Deposit via SMS
          </h3>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-rose-100 animate-slide-down flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl text-sm font-medium mb-4 border border-emerald-100 animate-slide-down flex items-center gap-2">
              <span>✅</span> {success}
            </div>
          )}

          <div className="space-y-1 mb-4">
            <label className="font-bold text-sm text-gray-700 block mb-2 flex items-center gap-2">
              <span className="step-number bg-purple-100 text-purple-600 w-6 h-6 rounded-lg text-xs">1</span>
              Transfer to
            </label>
            <div className="space-y-1.5">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    channel === ch
                      ? 'bg-purple-50 border-2 border-purple-300 shadow-sm'
                      : 'bg-gray-50 border-2 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${channel === ch ? 'text-purple-700' : 'text-gray-700'}`}>
                      {CHANNEL_LABELS[ch]}
                    </span>
                    <span className={`text-sm font-mono ${channel === ch ? 'text-purple-500' : 'text-gray-400'}`}>
                      {accounts?.[ch as keyof DepositAccounts] || '...'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {accounts && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <span className="text-purple-400">🏦</span>
                Account Name: <span className="font-medium text-gray-600">{accounts.accountName}</span>
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="font-bold text-sm text-gray-700 block mb-2 flex items-center gap-2">
              <span className="step-number bg-purple-100 text-purple-600 w-6 h-6 rounded-lg text-xs">2</span>
              Paste SMS Confirmation
            </label>
            <textarea
              placeholder="Paste the SMS you received after transfer..."
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              className="input w-full resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleDeposit}
            className="btn-primary w-full active:scale-[0.97]"
            disabled={depositing || !channel || !smsText.trim()}
          >
            {depositing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Submitting...
              </span>
            ) : 'Submit Deposit Request'}
          </button>
        </div>

        {/* Transactions */}
        <div className="animate-slide-up" style={{animationDelay:'0.2s'}}>
          <h3 className="font-extrabold text-gray-900 mb-4 text-lg">Transaction History</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[72px]" />
              ))}
            </div>
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </div>
      </div>
      <NavBar user={user} />
    </div>
  )
}
