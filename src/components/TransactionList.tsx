'use client'

import type { Transaction } from '@/types'

interface TransactionListProps {
  transactions: Transaction[]
}

const typeLabels: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
  card_purchase: 'Card Purchase',
  game_win: 'Game Win',
  refund: 'Refund',
  platform_fee: 'Platform Fee',
}

const statusBadge: Record<string, string> = {
  completed: 'badge-green',
  pending: 'badge-yellow',
  failed: 'badge-red',
  cancelled: 'badge-gray',
}

export default function TransactionList({ transactions }: TransactionListProps) {
  if (!transactions.length) {
    return <div className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>No transactions yet</div>
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div key={tx._id} className="card flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{typeLabels[tx.type] || tx.type}</div>
            <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {new Date(tx.createdAt).toLocaleDateString()}
            </div>
            {tx.description && (
              <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                {tx.description}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
            </div>
            <span className={statusBadge[tx.status] || 'badge-gray'}>{tx.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
