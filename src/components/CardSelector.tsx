'use client'

import type { BingoCard, CardData } from '@/types'

interface CardSelectorProps {
  cards: BingoCard[]
  cardPrice: number
  onSelect: (card: BingoCard) => void
  onRelease: (card: BingoCard) => void
  loading: boolean
}

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

function BingoBoardSmall({ card, drawnNumbers = [] }: { card: CardData; drawnNumbers?: number[] }) {
  const isFree = (num: number) => num === 0
  const isMarked = (num: number) => isFree(num) || drawnNumbers.includes(num)

  return (
    <div className="grid grid-cols-5 gap-px w-full max-w-[200px]">
      {COLUMNS.map((col, ci) => (
        <div
          key={col}
          className="text-center font-bold text-[9px] py-0.5 rounded-t text-white"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #5B21B6)' }}
        >
          {col}
        </div>
      ))}
      {[0, 1, 2, 3, 4].map((rowIdx) =>
        COLUMNS.map((col) => {
          const nums = card[col] || []
          const num: number = nums[rowIdx]
          const free = isFree(num)
          const marked = isMarked(num)
          return (
            <div
              key={`${col}-${rowIdx}`}
              className="text-center font-bold py-0.5 rounded text-[10px]"
              style={{
                background: free
                  ? 'rgba(245, 158, 11, 0.08)'
                  : marked
                  ? 'rgba(109, 40, 217, 0.12)'
                  : 'rgba(255,255,255,0.8)',
                color: free ? '#D97706' : marked ? '#6D28D9' : '#374151',
                border: '1px solid #F3F4F6',
              }}
            >
              {free ? '★' : num}
            </div>
          )
        })
      )}
    </div>
  )
}

export default function CardSelector({
  cards,
  cardPrice,
  onSelect,
  onRelease,
  loading,
}: CardSelectorProps) {
  const myCards = cards.filter((c) => c.isOwnedByMe && c.card)
  const lockedByMe = cards.filter((c) => c.isLockedByMe && !c.isOwnedByMe)
  const takenCount = cards.filter((c) => !c.isOwnedByMe && !c.isLockedByMe && (c.status === 'selected' || c.status === 'purchased')).length
  const availableCount = cards.filter((c) => c.status === 'available').length

  return (
    <div className="animate-fade-in">
      {cards.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
              <span className="text-lg">🎴</span> Pick Your Cards
            </h3>
            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                <span className="text-xs font-bold text-emerald-600">{availableCount}</span>
              </div>
              <div className="bg-purple-50 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-xs font-bold text-purple-600">{takenCount + myCards.length + lockedByMe.length}</span>
              </div>
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto hide-scrollbar rounded-2xl bg-white/60 backdrop-blur-sm p-2.5 border border-gray-100/80 shadow-sm">
            <div className="grid grid-cols-5 gap-2">
              {cards.map((card, i) => {
                const isAvailable = card.status === 'available'
                const isLocked = card.isLockedByMe && !card.isOwnedByMe
                const isOwned = card.isOwnedByMe
                const isTaken = !isAvailable && !isLocked && !isOwned

                let bg = 'linear-gradient(135deg, #EEF2FF, #E0E7FF)'
                let border = '#C7D2FE'
                let textColor = '#4338CA'
                let label = `${cardPrice} Br`
                let disabled = loading

                if (isOwned) {
                  bg = 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                  border = '#F59E0B'
                  textColor = '#92400E'
                  label = '★ MINE'
                  disabled = true
                } else if (isLocked) {
                  bg = 'linear-gradient(135deg, #FEE2E2, #FECACA)'
                  border = '#EF4444'
                  textColor = '#991B1B'
                  label = '🔒 Selected'
                  disabled = true
                } else if (isTaken) {
                  bg = '#F3F4F6'
                  border = '#D1D5DB'
                  textColor = '#9CA3AF'
                  label = 'Taken'
                  disabled = true
                }

                return (
                  <button
                    key={card._id}
                    onClick={() => {
                      if (isAvailable && !loading) onSelect(card)
                    }}
                    className="relative rounded-xl text-center py-3 px-1 font-bold transition-all duration-200 active:scale-90 hover:-translate-y-0.5"
                    style={{
                      background: bg,
                      border: '2px solid',
                      borderColor: border,
                      boxShadow: isAvailable
                        ? '0 2px 8px rgba(67, 56, 202, 0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
                        : isOwned
                        ? '0 4px 12px rgba(245, 158, 11, 0.2)'
                        : isLocked
                        ? '0 4px 12px rgba(239, 68, 68, 0.2)'
                        : 'none',
                      animationDelay: `${i * 0.02}s`,
                    }}
                    disabled={disabled}
                  >
                    <div
                      className={`text-sm ${isAvailable ? 'text-indigo-700' : ''}`}
                      style={{ color: textColor }}
                    >
                      #{card.cardNumber}
                    </div>
                    <div className="text-[9px] font-medium mt-0.5" style={{ color: textColor, opacity: isAvailable ? 0.6 : 1 }}>
                      {label}
                    </div>
                    {isAvailable && (
                      <div className="mt-1">
                        <div className="w-full h-0.5 rounded-full bg-gradient-to-r from-indigo-400/0 via-indigo-400/30 to-indigo-400/0 animate-shimmer-card" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Locked by me — show mini board preview */}
      {lockedByMe.length > 0 && lockedByMe[0].card && (
        <div className="mb-4">
          <h3 className="font-extrabold text-lg mb-3 flex items-center gap-2 text-rose-700">
            <span className="animate-wiggle">🔒</span> Your Selection
            <span className="text-sm font-normal text-rose-400">(confirming...)</span>
          </h3>
          <div className="rounded-2xl p-4 border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/30 overflow-hidden animate-slide-up shadow-lg shadow-rose-100/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xs">
                🔒
              </div>
              <span className="font-extrabold text-rose-800">Card #{lockedByMe[0].cardNumber}</span>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-1.5 shadow-inner">
                <BingoBoardSmall card={lockedByMe[0].card} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My purchased cards — show mini board preview */}
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
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent animate-shimmer-card pointer-events-none" />
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
