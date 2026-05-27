'use client'

import { useState, useEffect } from 'react'
import { getBalance, deposit, getTransactions } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TransactionList from '@/components/TransactionList'
import type { User, Transaction } from '@/types'

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const [bal, txs] = await Promise.all([getBalance(), getTransactions()])
        setBalance(bal)
        setTransactions(txs)
      } catch {
        setError('Failed to load wallet data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount')
      return
    }
    setDepositing(true)
    setError('')
    try {
      const url = await deposit(amount)
      if (url) window.open(url, '_blank')
      setDepositAmount('')
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
            ${balance.toFixed(2)}
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="font-bold mb-3">Deposit</h3>
          {error && (
            <div className="bg-red-100 text-red-700 text-sm p-2 rounded-lg mb-3">{error}</div>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="input flex-1"
              min="1"
              step="1"
            />
            <button
              onClick={handleDeposit}
              className="btn-primary"
              disabled={depositing || !depositAmount}
            >
              {depositing ? '...' : 'Deposit'}
            </button>
          </div>
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
