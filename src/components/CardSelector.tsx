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
  const takenCount = cards.filter((c) => !c.isOwnedByMe && (c.status === 'selected' || c.status === 'purchased')).length
  const availableCount = cards.filter((c) => c.status === 'available').length

  return (
    <div>
      {cards.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2">Cards ({cards.length})</h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-5 gap-1.5">
              {cards.map((card) => {
                const taken = card.status === 'selected' || card.status === 'purchased'
                return (
                  <button
                    key={card._id}
                    onClick={() => !taken && onSelect(card)}
                    className="card text-center py-2 px-1 transition-opacity"
                    style={{
                      borderColor: taken ? '#dc2626' : '#00beac',
                      borderWidth: '2px',
                      backgroundColor: taken ? '#fef2f2' : '#ffffff',
                    }}
                    disabled={loading || taken}
                  >
                    <div className="font-bold" style={{ color: taken ? '#dc2626' : '#00beac' }}>
                      #{card.cardNumber}
                    </div>
                    {taken && (
                      <div className="text-xs font-medium" style={{ color: '#dc2626' }}>
                        {card.isOwnedByMe ? 'Yours' : 'Taken'}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="text-xs mt-1" style={{ color: '#7fbcb4' }}>
            {availableCount} available &middot; {takenCount + myCards.length} taken
          </div>
        </div>
      )}

      {myCards.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2" style={{ color: '#dc2626' }}>
            My Card
          </h3>
          <div className="space-y-2">
            {myCards.map((card) => (
              <div key={card._id} className="card p-3" style={{ borderColor: '#dc2626', borderWidth: '2px', backgroundColor: '#fef2f2' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">Card #{card.cardNumber}</span>
                  <button
                    onClick={() => onRelease(card)}
                    className="px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                    disabled={loading}
                  >
                    Release
                  </button>
                </div>
                <div className="flex justify-center">
                  <BingoBoardSmall card={card.card!} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="text-center py-8" style={{ color: '#7fbcb4' }}>
          No cards available for this game
        </div>
      )}
    </div>
  )
}

function BingoBoardSmall({ card }: { card: CardData }) {
  const columns = ['B', 'I', 'N', 'G', 'O'] as const
  return (
    <div className="grid grid-cols-5 gap-0.5 w-full max-w-[260px]">
      {[0, 1, 2, 3, 4].map((rowIdx) =>
        columns.map((col) => {
          const nums = card[col] || []
          const num: number = nums[rowIdx]
          const isFree = num === 0
          return (
            <div
              key={`${col}-${rowIdx}`}
              className={`text-center font-bold py-1 rounded ${
                isFree ? 'bg-gray-200 text-xs' : ''
              }`}
              style={{ fontSize: isFree ? '11px' : '13px' }}
            >
              {isFree ? 'FREE' : num}
            </div>
          )
        })
      )}
    </div>
  )
}
