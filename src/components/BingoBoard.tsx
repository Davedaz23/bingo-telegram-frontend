'use client'

import { useMemo } from 'react'
import type { CardData } from '@/types'
import { cardDataToGrid, isNumberDrawn } from '@/lib/cardUtils'

interface BingoBoardProps {
  card: CardData
  drawnNumbers: number[]
  won?: boolean
}

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

export default function BingoBoard({ card, drawnNumbers, won }: BingoBoardProps) {
  const grid = useMemo(() => cardDataToGrid(card), [card])
  const lastDrawn = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null

  return (
    <div className={`inline-block select-none ${won ? 'bingo-card-win rounded-2xl p-0.5' : ''}`}>
      <div className="grid grid-cols-5 gap-1 mb-1">
        {COLUMNS.map((col) => (
          <div key={col} className="bingo-cell-header">
            {col}
          </div>
        ))}
      </div>
      {grid.map((row, ri) => (
        <div key={ri} className="grid grid-cols-5 gap-1 mb-1">
          {row.map((cell, ci) => {
            const drawn = isNumberDrawn(cell.number, drawnNumbers)
            const isFree = cell.number === 0
            const isCurrent = cell.number === lastDrawn && !isFree
            const cellClass = isCurrent
              ? 'bingo-cell-current'
              : drawn || isFree
              ? 'bingo-cell-marked'
              : drawnNumbers.length > 0 && drawn
              ? 'bingo-cell-drawn'
              : 'bingo-cell-default'

            return (
              <div
                key={`${ri}-${ci}`}
                className={`bingo-cell ${cellClass}`}
                style={
                  isFree && !isCurrent
                    ? { opacity: 0.5 }
                    : isCurrent
                    ? {
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        color: '#ffffff',
                        borderColor: 'transparent',
                      }
                    : drawn && !isFree
                    ? {
                        background: 'linear-gradient(135deg, #6D28D9, #5B21B6)',
                        color: '#ffffff',
                        borderColor: 'transparent',
                        boxShadow: '0 2px 8px rgba(109, 40, 217, 0.3)',
                      }
                    : undefined
                }
              >
                {isFree ? (
                  <span className={isCurrent ? 'text-lg' : 'text-base'}>⭐</span>
                ) : (
                  <span className="text-sm sm:text-base font-bold">{cell.number}</span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
