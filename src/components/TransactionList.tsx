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
    return <div className="text-center py-8" style={{ color: '#ffffff' }}>No transactions yet</div>
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div key={tx._id} className="card flex items-center justify-between">
          <div>
            <div className="font-medium">{typeLabels[tx.type] || tx.type}</div>
            <div className="text-sm" style={{ color: '#ffffff' }}>
              {new Date(tx.createdAt).toLocaleDateString()}
            </div>
            {tx.description && (
              <div className="text-sm" style={{ color: '#ffffff' }}>
                {tx.description}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} Birr
            </div>
            <span className={statusBadge[tx.status] || 'badge-gray'}>{tx.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
