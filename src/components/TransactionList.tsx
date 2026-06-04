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

const typeIcons: Record<string, string> = {
  deposit: '📥',
  withdrawal: '📤',
  transfer: '🔄',
  card_purchase: '🎴',
  game_win: '🏆',
  refund: '💰',
  platform_fee: '⚙️',
}

const statusBadge: Record<string, string> = {
  completed: 'badge-green',
  pending: 'badge-accent',
  failed: 'badge-red',
  cancelled: 'badge-gray',
}

export default function TransactionList({ transactions }: TransactionListProps) {
  if (!transactions.length) {
    return (
      <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-gray-400 font-medium">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx._id}
          className="rounded-2xl p-4 bg-white border border-gray-100 flex items-center gap-3 transition-all hover:border-gray-200"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{
              background: tx.amount > 0
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(244, 63, 94, 0.1)',
            }}
          >
            {typeIcons[tx.type] || '💳'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900">{typeLabels[tx.type] || tx.type}</div>
            <div className="text-xs text-gray-400">
              {new Date(tx.createdAt).toLocaleDateString()}
              {tx.description && ` · ${tx.description}`}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className={`font-extrabold ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} Br
            </div>
            <span className={statusBadge[tx.status] || 'badge-gray'}>{tx.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
