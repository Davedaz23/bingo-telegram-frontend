'use client'

import { useMemo } from 'react'
import type { CardData } from '@/types'
import { cardDataToGrid, isNumberDrawn } from '@/lib/cardUtils'

interface BingoBoardProps {
  card: CardData
  drawnNumbers: number[]
}

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

export default function BingoBoard({ card, drawnNumbers }: BingoBoardProps) {
  const grid = useMemo(() => cardDataToGrid(card), [card])

  return (
    <div className="inline-block select-none">
      <div className="grid grid-cols-5 gap-0.5 mb-0.5">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-t text-xs sm:text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--tg-theme-button-color)' }}
          >
            {col}
          </div>
        ))}
      </div>
      {grid.map((row, ri) => (
        <div key={ri} className="grid grid-cols-5 gap-0.5 mb-0.5">
          {row.map((cell, ci) => {
            const drawn = isNumberDrawn(cell.number, drawnNumbers)
            const isFree = cell.number === 0
            return (
              <div
                key={`${ri}-${ci}`}
                className={`bingo-cell ${drawn || isFree ? 'bingo-cell-marked' : 'bingo-cell-default'}`}
                style={
                  drawn || isFree
                    ? {
                        backgroundColor: 'var(--tg-theme-button-color)',
                        color: 'var(--tg-theme-button-text-color)',
                        borderColor: 'var(--tg-theme-button-color)',
                        opacity: isFree ? 0.5 : 1,
                      }
                    : undefined
                }
              >
                {isFree ? '★' : cell.number}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
