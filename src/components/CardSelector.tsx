'use client'

import type { BingoCard } from '@/types'
import BingoBoard from './BingoBoard'

interface CardSelectorProps {
  cards: BingoCard[]
  selectedCardId: string | null
  cardPrice: number
  onSelect: (card: BingoCard) => void
  onPurchase: (card: BingoCard) => void
  onRelease: (card: BingoCard) => void
  loading: boolean
}

export default function CardSelector({
  cards,
  selectedCardId,
  cardPrice,
  onSelect,
  onPurchase,
  onRelease,
  loading,
}: CardSelectorProps) {
  const taken = cards.filter((c) => c.status === 'selected' && !c.isLockedByMe)
  const available = cards.filter((c) => c.status === 'available')
  const selected = cards.find((c) => c._id === selectedCardId)

  if (selected && selected.card) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Card #{selected.cardNumber}</h3>
          <span className="text-sm font-semibold" style={{ color: 'var(--tg-theme-button-color)' }}>
            {cardPrice} Birr
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
            {loading ? 'Processing...' : `Buy ${cardPrice} Birr`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {available.length > 0 && (
        <div className="mb-4">
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
                  {cardPrice} Birr
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {taken.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 text-red-500">Taken ({taken.length})</h3>
          <div className="grid grid-cols-4 gap-2">
            {taken.map((card) => (
              <div
                key={card._id}
                className="card text-center py-3 opacity-50"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <div className="text-lg font-bold" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  #{card.cardNumber}
                </div>
                <div className="text-xs text-red-400">Taken</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {available.length === 0 && taken.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
          No cards available for this game
        </div>
      )}
    </div>
  )
}
