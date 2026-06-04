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
    <div className="pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Wallet</h1>

        {/* Balance card */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white mb-6 shadow-2xl shadow-purple-200">
          <div className="text-sm text-purple-200 font-medium mb-1">
            Available Balance
          </div>
          <div className="text-4xl font-extrabold">
            {balance.toFixed(2)} <span className="text-lg font-semibold text-purple-200">Birr</span>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="bg-white/15 rounded-xl px-3 py-1.5 text-xs font-medium text-purple-100">
              Wallet
            </div>
          </div>
        </div>

        {/* Deposit section */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 mb-6">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-lg">📥</span> Deposit via SMS
          </h3>

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

          <div className="mb-4">
            <label className="font-bold text-sm text-gray-700 block mb-2">Transfer to</label>
            <div className="space-y-1.5">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 ${
                    channel === ch
                      ? 'bg-purple-50 border-2 border-purple-300 shadow-sm'
                      : 'bg-gray-50 border-2 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${channel === ch ? 'text-purple-700' : 'text-gray-700'}`}>
                      {CHANNEL_LABELS[ch]}
                    </span>
                    <span className={`text-sm ${channel === ch ? 'text-purple-500' : 'text-gray-400'}`}>
                      {accounts?.[ch as keyof DepositAccounts] || '...'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {accounts && (
              <p className="text-xs text-gray-400 mt-2">
                Account Name: <span className="font-medium text-gray-600">{accounts.accountName}</span>
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="font-bold text-sm text-gray-700 block mb-2">
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
            className="btn-primary w-full"
            disabled={depositing || !channel || !smsText.trim()}
          >
            {depositing ? 'Submitting...' : 'Submit Deposit Request'}
          </button>
        </div>

        {/* Transactions */}
        <div>
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
