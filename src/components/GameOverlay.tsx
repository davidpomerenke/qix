'use client'

import { useEffect, useState } from 'react'
import { GameState } from '@/lib/game/types'
import { HighScore, getHighScores, saveHighScore } from '@/lib/game/highscores'

interface Props {
  state: GameState
  onStart: () => void
}

export function GameOverlay({ state, onStart }: Props) {
  const [highScores, setHighScores] = useState<HighScore[]>([])
  const [showNameInput, setShowNameInput] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [savedScore, setSavedScore] = useState<number | null>(null)
  
  useEffect(() => {
    if (state.phase === 'start') {
      getHighScores().then(setHighScores).catch(() => {})
    }
  }, [state.phase])
  
  useEffect(() => {
    if (state.phase === 'gameover' && savedScore !== state.score) {
      setShowNameInput(true)
    }
  }, [state.phase, state.score, savedScore])
  
  useEffect(() => {
    if (state.phase === 'playing') {
      setSavedScore(null)
      setShowNameInput(false)
      setPlayerName('')
    }
  }, [state.phase])

  const handleSubmitScore = async () => {
    if (!playerName.trim()) return
    const scores = await saveHighScore(playerName.trim(), state.score, state.level)
    setHighScores(scores)
    setSavedScore(state.score)
    setShowNameInput(false)
  }

  if (state.phase === 'playing' || state.phase === 'dying') return null
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg backdrop-blur-sm">
      <div className="text-center px-8 py-6">
        {state.phase === 'start' && (
          <>
            <h1 className="text-5xl font-black tracking-tighter mb-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
              QIX
            </h1>
            <p className="text-gray-400 mb-6 text-sm">Claim 75% of the field to win</p>
            <button onClick={onStart} className="btn-primary">
              Start Game
            </button>
            <p className="text-gray-500 text-xs mt-4 hidden sm:block">
              Press Space or Enter to start
            </p>
            <p className="text-gray-500 text-xs mt-4 sm:hidden">
              Double tap to start
            </p>
            {highScores.length > 0 && <HighScoreTable scores={highScores} />}
          </>
        )}
        
        {state.phase === 'paused' && (
          <>
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">Paused</h2>
            <button onClick={onStart} className="btn-primary">
              Resume
            </button>
          </>
        )}
        
        {state.phase === 'gameover' && (
          <>
            <h2 className="text-3xl font-bold text-red-500 mb-2">Game Over</h2>
            <p className="text-gray-300 mb-1">Level {state.level}</p>
            <p className="text-2xl font-bold text-white mb-4">{state.score.toLocaleString()} pts</p>
            
            {showNameInput ? (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitScore()}
                  maxLength={20}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-center w-48 mb-2"
                  autoFocus
                />
                <div>
                  <button onClick={handleSubmitScore} className="btn-primary text-sm">
                    Save Score
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={onStart} className="btn-primary">
                Play Again
              </button>
            )}
            
            {highScores.length > 0 && <HighScoreTable scores={highScores} currentScore={savedScore ?? undefined} />}
          </>
        )}
        
        {state.phase === 'levelcomplete' && (
          <>
            <h2 className="text-3xl font-bold text-green-400 mb-2">Level Complete!</h2>
            <p className="text-gray-300 mb-1">
              Claimed {state.claimPercentage.toFixed(1)}%
            </p>
            <p className="text-2xl font-bold text-white mb-4">{state.score.toLocaleString()} pts</p>
            <button onClick={onStart} className="btn-primary">
              Next Level
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function HighScoreTable({ scores, currentScore }: { scores: HighScore[], currentScore?: number }) {
  return (
    <div className="mt-6">
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3 text-center">🏆 Top Scores</h3>
        <div className="space-y-1.5">
          {scores.map((s, i) => {
            const isCurrentScore = s.score === currentScore
            const isTop3 = i < 3
            return (
              <div 
                key={i} 
                className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                  isCurrentScore ? 'bg-cyan-500/20 border border-cyan-500/30' : ''
                }`}
              >
                <span className={`w-5 text-right font-bold ${
                  isTop3 ? ['text-yellow-400', 'text-gray-300', 'text-amber-600'][i] : 'text-gray-600'
                }`}>
                  {i + 1}
                </span>
                <span className={`w-20 truncate text-left text-sm ${isCurrentScore ? 'text-cyan-300' : 'text-gray-400'}`}>
                  {s.name}
                </span>
                <span className={`w-16 font-mono text-sm text-right ${isCurrentScore ? 'text-cyan-300' : 'text-white'}`}>
                  {s.score.toLocaleString()}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isCurrentScore ? 'bg-cyan-500/30 text-cyan-300' : 'bg-gray-700/50 text-gray-400'
                }`}>
                  L{s.level}
                </span>
                <span className="flex-1 text-[10px] text-gray-600 text-right">{s.date}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
