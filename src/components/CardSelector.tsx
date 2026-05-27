'use client'

import type { BingoCard } from '@/types'
import BingoBoard from './BingoBoard'

interface CardSelectorProps {
  cards: BingoCard[]
  selectedCardId: string | null
  onSelect: (card: BingoCard) => void
  onPurchase: (card: BingoCard) => void
  onRelease: (card: BingoCard) => void
  loading: boolean
}

export default function CardSelector({
  cards,
  selectedCardId,
  onSelect,
  onPurchase,
  onRelease,
  loading,
}: CardSelectorProps) {
  const available = cards.filter((c) => c.status === 'available')
  const selected = cards.find((c) => c._id === selectedCardId)

  if (selected && selected.card) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Card #{selected.cardNumber}</h3>
          <span className="text-sm font-semibold" style={{ color: 'var(--tg-theme-button-color)' }}>
            {selected.price || 0} Birr
          </span>
        </div>
        <div className="flex justify-center">
          <BingoBoard card={selected.card} drawnNumbers={[]} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => onRelease(selected)} className="btn-secondary flex-1" disabled={loading}>
            Release
          </button>
          <button onClick={() => onPurchase(selected)} className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Processing...' : `Buy ${selected.price || 0} Birr`}
          </button>
        </div>
      </div>
    )
  }

  if (!available.length) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        No cards available for this game
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-bold mb-3">Available Cards ({available.length})</h3>
      <div className="grid grid-cols-4 gap-2">
        {available.map((card) => (
          <button
            key={card._id}
            onClick={() => onSelect(card)}
            className="card text-center py-3 hover:opacity-80 transition-opacity"
            disabled={loading}
          >
            <div className="text-lg font-bold">#{card.cardNumber}</div>
            <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {card.price || 0} Birr
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
