'use client'

import Link from 'next/link'
import type { Game } from '@/types'

interface GameListItemProps {
  game: Game
}

const statusBadge: Record<string, string> = {
  selection: 'badge-blue',
  starting: 'badge-yellow',
  active: 'badge-green',
  finished: 'badge-gray',
  cancelled: 'badge-red',
  refunding: 'badge-yellow',
}

export default function GameListItem({ game }: GameListItemProps) {
  return (
    <Link href={`/games/${game._id}`} className="card block hover:opacity-80 transition-opacity mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lg">#{game.gameCode}</span>
        <span className={statusBadge[game.status] || 'badge-gray'}>
          {game.status}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
        <span>🎯 <strong className="text-base" style={{ color: 'var(--tg-theme-text-color)' }}>{game.prizePool} Birr</strong></span>
        <span>🎴 {game.purchasedCards ?? '?'} cards</span>
        <span>🏆 Win {Math.floor(Number(game.prizePool) * 0.8)} Birr</span>
      </div>
    </Link>
  )
}
