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
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">Pick Your Cards</h3>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                {availableCount} free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                {takenCount + myCards.length} taken
              </span>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto rounded-2xl bg-white/50 p-2 border border-gray-100">
            <div className="grid grid-cols-5 gap-2">
              {cards.map((card) => {
                const taken = card.status === 'selected' || card.status === 'purchased'
                return (
                  <button
                    key={card._id}
                    onClick={() => !taken && onSelect(card)}
                    className="relative rounded-xl text-center py-3 px-1 font-bold transition-all duration-200"
                    style={{
                      background: taken
                        ? card.isOwnedByMe
                          ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                          : '#F3F4F6'
                        : '#FFFFFF',
                      border: '2px solid',
                      borderColor: taken
                        ? card.isOwnedByMe
                          ? '#F59E0B'
                          : '#D1D5DB'
                        : '#E5E7EB',
                    }}
                    disabled={loading || taken}
                  >
                    <div
                      className={`text-sm ${
                        taken
                          ? card.isOwnedByMe
                            ? 'text-amber-700'
                            : 'text-gray-400'
                          : 'text-purple-600'
                      }`}
                    >
                      #{card.cardNumber}
                    </div>
                    {taken && (
                      <div
                        className={`text-[10px] font-bold mt-0.5 ${
                          card.isOwnedByMe ? 'text-amber-600' : 'text-gray-400'
                        }`}
                      >
                        {card.isOwnedByMe ? '★ MINE' : 'Taken'}
                      </div>
                    )}
                    {!taken && (
                      <div className="text-[9px] text-gray-400 mt-0.5 font-medium">
                        {cardPrice} Br
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {myCards.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span>🎯</span> My Cards
            <span className="text-sm font-normal text-gray-400">({myCards.length})</span>
          </h3>
          <div className="space-y-3">
            {myCards.map((card) => (
              <div
                key={card._id}
                className="relative rounded-2xl p-4 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/40 overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    #{card.cardNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-amber-800 text-lg">Card #{card.cardNumber}</span>
                  <button
                    onClick={() => onRelease(card)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/80 text-rose-500 border border-rose-200 hover:bg-rose-50 transition-all disabled:opacity-40"
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
        <div className="text-center py-12 bg-white/60 rounded-2xl border border-gray-100">
          <div className="text-4xl mb-3">🎴</div>
          <p className="text-gray-400 font-medium">No cards available for this game</p>
        </div>
      )}
    </div>
  )
}

function BingoBoardSmall({ card }: { card: CardData }) {
  const columns = ['B', 'I', 'N', 'G', 'O'] as const
  return (
    <div className="grid grid-cols-5 gap-0.5 w-full max-w-[220px]">
      {columns.map((col, ci) => (
        <div
          key={col}
          className="text-center font-bold text-[10px] py-0.5 rounded-t text-white"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #5B21B6)' }}
        >
          {col}
        </div>
      ))}
      {[0, 1, 2, 3, 4].map((rowIdx) =>
        columns.map((col) => {
          const nums = card[col] || []
          const num: number = nums[rowIdx]
          const isFree = num === 0
          return (
            <div
              key={`${col}-${rowIdx}`}
              className="text-center font-bold py-1 rounded text-xs"
              style={{
                background: isFree
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(255,255,255,0.6)',
                color: isFree ? '#D97706' : '#374151',
                border: '1px solid #F3F4F6',
              }}
            >
              {isFree ? '★' : num}
            </div>
          )
        })
      )}
    </div>
  )
}
