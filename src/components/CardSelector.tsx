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
    <div className="animate-fade-in">
      {cards.length > 0 && (
        <div className="mb-4">
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
              <span className="text-lg">🎴</span> Pick Your Cards
            </h3>
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-50 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                <span className="text-xs font-bold text-emerald-600">{availableCount}</span>
              </div>
              <div className="bg-purple-50 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-xs font-bold text-purple-600">{takenCount + myCards.length}</span>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="max-h-52 overflow-y-auto hide-scrollbar rounded-2xl bg-white/60 backdrop-blur-sm p-2.5 border border-gray-100/80 shadow-sm">
            <div className="grid grid-cols-5 gap-2">
              {cards.map((card, i) => {
                const taken = card.status === 'selected' || card.status === 'purchased'
                const lockedByMe = card.status === 'selected' && card.isOwnedByMe
                const isAvailable = card.status === 'available'
                return (
                  <button
                    key={card._id}
                    onClick={() => {
                      if (isAvailable) onSelect(card)
                    }}
                    className="relative rounded-xl text-center py-3 px-1 font-bold transition-all duration-200 active:scale-90"
                    style={{
                      animationDelay: `${i * 0.02}s`,
                      background: taken
                        ? card.isOwnedByMe
                          ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                          : '#F3F4F6'
                        : 'linear-gradient(135deg, #FFFFFF, #FAFAFA)',
                      border: '2px solid',
                      borderColor: taken
                        ? card.isOwnedByMe
                          ? '#F59E0B'
                          : '#E5E7EB'
                        : '#E5E7EB',
                      boxShadow: taken
                        ? card.isOwnedByMe
                          ? '0 4px 12px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
                          : 'none'
                        : '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                    }}
                    disabled={loading || taken}
                  >
                    {isAvailable && (
                      <div
                        className="absolute inset-[-2px] rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(109,40,217,0.08), rgba(139,92,246,0.04))',
                          border: '2px solid rgba(109,40,217,0.2)',
                        }}
                      />
                    )}
                    <div
                      className={`relative text-sm ${
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
                        className={`relative text-[10px] font-bold mt-0.5 ${
                          lockedByMe ? 'text-amber-600' : card.isOwnedByMe ? 'text-amber-600' : 'text-gray-400'
                        }`}
                      >
                        {card.isOwnedByMe ? '★ MINE' : lockedByMe ? '🔒 Locked' : 'Taken'}
                      </div>
                    )}
                    {isAvailable && (
                      <div className="relative text-[9px] text-gray-400 mt-0.5 font-medium">
                        {cardPrice} Br
                      </div>
                    )}
                    {isAvailable && (
                      <div className="relative mt-1">
                        <div className="w-full h-1 rounded-full bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 animate-shimmer-card" />
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
          <h3 className="font-extrabold text-lg mb-3 flex items-center gap-2 text-gray-900">
            <span className="animate-bounce-soft">🎯</span> My Cards
            <span className="text-sm font-normal text-gray-400">({myCards.length})</span>
          </h3>
          <div className="space-y-3">
            {myCards.map((card, i) => (
              <div
                key={card._id}
                className="relative rounded-2xl p-4 border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/30 overflow-hidden animate-slide-up shadow-lg shadow-amber-100/30"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent animate-shimmer-card pointer-events-none" />
                {/* Top-right number badge */}
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-200/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    #{card.cardNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3 relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-amber-200/50">
                      🎴
                    </div>
                    <span className="font-extrabold text-amber-800">Card #{card.cardNumber}</span>
                  </div>
                  <button
                    onClick={() => onRelease(card)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/80 text-rose-500 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-all disabled:opacity-40 active:scale-90 backdrop-blur-sm"
                    disabled={loading}
                  >
                    Release
                  </button>
                </div>
                <div className="flex justify-center relative">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-1.5 shadow-inner">
                    <BingoBoardSmall card={card.card!} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 animate-scale-in">
          <div className="text-5xl mb-3 animate-float">🎴</div>
          <p className="text-gray-400 font-bold">No cards available</p>
          <p className="text-xs text-gray-300 mt-1">Check back for the next game</p>
        </div>
      )}
    </div>
  )
}

function BingoBoardSmall({ card }: { card: CardData }) {
  const columns = ['B', 'I', 'N', 'G', 'O'] as const
  return (
    <div className="grid grid-cols-5 gap-px w-full max-w-[220px]">
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
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(255,255,255,0.8)',
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
