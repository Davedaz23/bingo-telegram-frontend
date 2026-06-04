'use client'

import { useMemo } from 'react'
import type { CardData, WinningLine } from '@/types'
import { cardDataToGrid, isNumberDrawn } from '@/lib/cardUtils'

interface BingoBoardProps {
  card: CardData
  drawnNumbers: number[]
  won?: boolean
  winningLine?: WinningLine | null
}

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

function isWinningCell(ri: number, ci: number, winningLine?: WinningLine | null): boolean {
  if (!winningLine) return false
  const { type, index } = winningLine
  if (type === 'full_card') return true
  if (type === 'four_corners') {
    return (ri === 0 && ci === 0) || (ri === 0 && ci === 4) || (ri === 4 && ci === 0) || (ri === 4 && ci === 4)
  }
  if (type === 'row') return ri === index
  if (type === 'column') return ci === index
  if (type === 'diagonal') {
    if (index === 0) return ri === ci
    if (index === 1) return ri + ci === 4
  }
  return false
}

export default function BingoBoard({ card, drawnNumbers, won, winningLine }: BingoBoardProps) {
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
            const winCell = isWinningCell(ri, ci, winningLine)

            let cellClass = ''
            if (winCell) {
              cellClass = 'bingo-cell-winning'
            } else if (isCurrent) {
              cellClass = 'bingo-cell-current'
            } else if (drawn || isFree) {
              cellClass = 'bingo-cell-marked'
            } else if (drawnNumbers.length > 0 && drawn) {
              cellClass = 'bingo-cell-drawn'
            } else {
              cellClass = 'bingo-cell-default'
            }

            return (
              <div
                key={`${ri}-${ci}`}
                className={`bingo-cell ${cellClass}`}
                style={
                  winCell
                    ? {
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        color: '#ffffff',
                        borderColor: 'transparent',
                        boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.4), 0 0 20px rgba(245, 158, 11, 0.3)',
                        animation: 'goldPulse 0.8s ease-in-out infinite',
                      }
                    : isFree && !isCurrent
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
                  <span className={isCurrent || winCell ? 'text-lg' : 'text-base'}>{winCell ? '👑' : '⭐'}</span>
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
