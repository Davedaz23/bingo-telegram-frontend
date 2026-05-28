'use client'

import type { BingoCard, CardData } from '@/types'

interface CardSelectorProps {
  cards: BingoCard[]
  cardPrice: number
  onSelect: (card: BingoCard) => void
  onRelease: (card: BingoCard) => void
  loading: boolean
}

export default function CardSelector({
  cards,
  cardPrice,
  onSelect,
  onRelease,
  loading,
}: CardSelectorProps) {
  const myCards = cards.filter((c) => c.isOwnedByMe && c.card)
  const taken = cards.filter((c) => (c.status === 'selected' || c.status === 'purchased') && !c.isOwnedByMe)
  const available = cards.filter((c) => c.status === 'available')

  return (
    <div>
      {available.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2 text-sm">Available Cards ({available.length})</h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-5 gap-1.5">
              {available.map((card) => (
                <button
                  key={card._id}
                  onClick={() => onSelect(card)}
                  className="card text-center py-2 px-1 hover:opacity-80 transition-opacity"
                  disabled={loading}
                >
                  <div className="text-xs font-bold">#{card.cardNumber}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {myCards.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2 text-sm" style={{ color: '#0ca3db' }}>
            My Cards ({myCards.length})
          </h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {myCards.map((card) => (
              <div key={card._id} className="card p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Card #{card.cardNumber}</span>
                  <button
                    onClick={() => onRelease(card)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                    disabled={loading}
                  >
                    Release
                  </button>
                </div>
                <div className="flex justify-center scale-[0.6] origin-top -mb-8">
                  <BingoBoardSmall card={card.card!} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {taken.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2 text-sm text-red-500">Taken ({taken.length})</h3>
          <div className="grid grid-cols-5 gap-1.5">
            {taken.map((card) => (
              <div
                key={card._id}
                className="card text-center py-2 px-1 opacity-50"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="text-xs font-bold" style={{ color: '#c39977' }}>
                  #{card.cardNumber}
                </div>
                <div className="text-[10px] text-red-400">Taken</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {available.length === 0 && myCards.length === 0 && taken.length === 0 && (
        <div className="text-center py-8 text-sm" style={{ color: '#c39977' }}>
          No cards available for this game
        </div>
      )}
    </div>
  )
}

function BingoBoardSmall({ card }: { card: CardData }) {
  const columns = ['B', 'I', 'N', 'G', 'O'] as const
  return (
    <div className="grid grid-cols-5 gap-0.5 w-full max-w-[200px]">
      {columns.map((col) =>
        (card[col] || []).map((num: number, idx: number) => (
          <div
            key={`${col}-${idx}`}
            className={`text-center text-[8px] leading-none py-0.5 rounded-sm ${
              col === 'N' && idx === 2 ? 'bg-gray-200' : ''
            }`}
          >
            {col === 'N' && idx === 2 ? 'FREE' : num}
          </div>
        ))
      )}
    </div>
  )
}
