import type { CardData, CardCell } from '@/types'

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const

export function cardDataToGrid(cardData: CardData): CardCell[][] {
  const grid: CardCell[][] = []
  for (let row = 0; row < 5; row++) {
    const rowArr: CardCell[] = []
    for (const col of COLUMNS) {
      const num = cardData[col][row]
      rowArr.push({ column: col, number: num, marked: num === 0 })
    }
    grid.push(rowArr)
  }
  return grid
}

export function cardDataToFlat(cardData: CardData): CardCell[] {
  const flat: CardCell[] = []
  for (const col of COLUMNS) {
    for (let row = 0; row < 5; row++) {
      const num = cardData[col][row]
      flat.push({ column: col, number: num, marked: num === 0 })
    }
  }
  return flat
}

export function isNumberDrawn(num: number, drawnNumbers: number[]): boolean {
  return num !== 0 && drawnNumbers.includes(num)
}
