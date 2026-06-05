'use client'

import Link from 'next/link'
import type { Game } from '@/types'

interface GameListItemProps {
  game: Game
}

const statusConfig: Record<string, { class: string; label: string }> = {
  selection: { class: 'badge-primary', label: 'Open' },
  starting: { class: 'badge-accent', label: 'Starting' },
  active: { class: 'badge-green', label: 'Live' },
  finished: { class: 'badge-gray', label: 'Ended' },
  cancelled: { class: 'badge-red', label: 'Cancelled' },
  refunding: { class: 'badge-accent', label: 'Refunding' },
}

export default function GameListItem({ game }: GameListItemProps) {
  const cfg = statusConfig[game.status] || { class: 'badge-gray', label: game.status }

  return (
    <Link
      href={`/games/${game._id}`}
      className="block rounded-2xl p-4 bg-white border border-gray-100 transition-all duration-200 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/30 hover:-translate-y-0.5 mb-3 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-purple-200">
            #{game.gameCode}
          </div>
          <div>
            <div className="font-bold text-gray-900">Game #{game.gameCode}</div>
            <div className="text-xs text-gray-400">
              {game.purchasedCards ?? 0} cards sold
            </div>
          </div>
        </div>
        <span className={cfg.class}>{cfg.label}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 font-bold">{game.prizePool.toFixed(0)}</span>
          <span className="text-gray-400">Birr prize</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-purple-500 font-bold">{Math.floor(Number(game.prizePool) * 0.8).toFixed(0)}</span>
          <span className="text-gray-400">Birr win</span>
        </div>
      </div>
    </Link>
  )
}
