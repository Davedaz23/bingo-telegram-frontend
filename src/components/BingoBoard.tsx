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
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-t font-bold text-white"
            style={{ backgroundColor: '#0ca3db', fontSize: '14px' }}
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
                        backgroundColor: '#0ca3db',
                        color: '#ffffff',
                        borderColor: '#0ca3db',
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
