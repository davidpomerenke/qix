'use client'

import { GameState } from '@/lib/game/types'

interface Props {
  state: GameState
}

export function HUD({ state }: Props) {
  return (
    <div className="flex items-center justify-between w-full max-w-[900px] mb-4 px-2 text-sm">
      <div className="flex gap-6">
        <div>
          <span className="text-gray-500 uppercase text-xs tracking-wide">Level</span>
          <p className="text-cyan-400 font-bold text-lg">{state.level}</p>
        </div>
        <div>
          <span className="text-gray-500 uppercase text-xs tracking-wide">Score</span>
          <p className="text-white font-bold text-lg">{state.score.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-2">
          <span className="text-gray-500 uppercase text-xs tracking-wide">Claimed</span>
          <span className="text-white font-mono text-sm">{state.claimPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-28 h-2 bg-gray-800 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (state.claimPercentage / state.targetPercentage) * 100)}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="text-gray-500 uppercase text-xs tracking-wide mr-2">Lives</span>
        {Array.from({ length: state.player.lives }).map((_, i) => (
          <div key={i} className="w-3 h-3 bg-green-400 rounded-sm shadow-lg shadow-green-400/30" />
        ))}
        {Array.from({ length: 3 - state.player.lives }).map((_, i) => (
          <div key={i} className="w-3 h-3 bg-gray-700 rounded-sm" />
        ))}
      </div>
    </div>
  )
}

