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
  const taken = cards.filter((c) => !c.isOwnedByMe && (c.status === 'selected' || c.status === 'purchased'))
  const available = cards.filter((c) => c.status === 'available')
  const showCards = [...available, ...myCards]

  return (
    <div>
      {showCards.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2">
            Available Cards ({available.length})
          </h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-5 gap-1.5">
              {showCards.map((card) => {
                const owned = card.isOwnedByMe
                return (
                  <button
                    key={card._id}
                    onClick={() => !owned && onSelect(card)}
                    className="card text-center py-2 px-1 transition-opacity"
                    style={{
                      borderColor: owned ? '#dc2626' : '#0ca3db',
                      borderWidth: '2px',
                      opacity: owned ? 0.9 : 1,
                    }}
                    disabled={loading || owned}
                  >
                    <div className="font-bold" style={{ color: owned ? '#dc2626' : '#0ca3db' }}>
                      #{card.cardNumber}
                    </div>
                    {owned && (
                      <div className="text-xs font-medium" style={{ color: '#dc2626' }}>Yours</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {taken.length > 0 && (
            <div className="text-xs mt-1" style={{ color: '#c39977' }}>
              Taken: {taken.length} other{taken.length > 1 ? 's' : ''} &middot; {available.length} left
            </div>
          )}
        </div>
      )}

      {myCards.length > 0 && (
        <div className="mb-3">
          <h3 className="font-bold mb-2" style={{ color: '#dc2626' }}>
            My Card
          </h3>
          <div className="space-y-2">
            {myCards.map((card) => (
              <div key={card._id} className="card p-3" style={{ borderColor: '#dc2626', borderWidth: '2px' }}>
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

      {showCards.length === 0 && (
        <div className="text-center py-8" style={{ color: '#c39977' }}>
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
      {columns.map((col) =>
        (card[col] || []).map((num: number, idx: number) => (
          <div
            key={`${col}-${idx}`}
            className={`text-center font-bold py-1 rounded ${
              col === 'N' && idx === 2 ? 'bg-gray-200 text-xs' : ''
            }`}
            style={{ fontSize: col === 'N' && idx === 2 ? '11px' : '13px' }}
          >
            {col === 'N' && idx === 2 ? 'FREE' : num}
          </div>
        ))
      )}
    </div>
  )
}
