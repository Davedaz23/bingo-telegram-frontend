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
    <div className="pb-16">
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-6">Wallet</h1>

        <div className="card text-center mb-6">
          <div className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Available Balance
          </div>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--tg-theme-button-color)' }}>
            {balance.toFixed(2)} Birr
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="font-bold mb-3">Deposit via SMS</h3>

          {error && (
            <div className="bg-red-100 text-red-700 text-sm p-2 rounded-lg mb-3">{error}</div>
          )}
          {success && (
            <div className="bg-green-100 text-green-700 text-sm p-2 rounded-lg mb-3">{success}</div>
          )}

          <div className="mb-3">
            <label className="text-xs font-medium block mb-1">Transfer to</label>
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`block w-full text-left p-2 rounded-lg mb-1 text-sm border transition-colors ${
                  channel === ch
                    ? 'border-blue-500 bg-blue-50 font-medium'
                    : 'border-transparent bg-gray-50'
                }`}
              >
                <span className="font-medium">{CHANNEL_LABELS[ch]}</span>
                {accounts && (
                  <span className="ml-2" style={{ color: 'var(--tg-theme-hint-color)' }}>
                    {accounts[ch as keyof DepositAccounts]}
                  </span>
                )}
              </button>
            ))}
            {accounts && (
              <p className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Account Name: {accounts.accountName}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label className="text-xs font-medium block mb-1">
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

        <div>
          <h3 className="font-bold mb-3">Transaction History</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse h-16" />
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
