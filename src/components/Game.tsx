'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameState, GameConfig, InputState, TestCommand } from '@/lib/game/types'
import { createInitialState, updateGame, DEFAULT_CONFIG, nextLevel, queueTestCommands } from '@/lib/game/engine'
import { createKeyboardHandler } from '@/lib/input/keyboard'
import { createTouchHandler } from '@/lib/input/touch'
import { renderGame } from './renderer'
import { GameOverlay } from './GameOverlay'
import { HUD } from './HUD'

// Expose test function globally for debugging
declare global {
  interface Window {
    qixTest: (commands: Array<{ dir: string, frames: number }>) => void
    qixState: () => GameState
  }
}

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [gameState, setGameState] = useState<GameState>(() => createInitialState())
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const inputRef = useRef<InputState>({ direction: null, slowDraw: false })
  const lastTimeRef = useRef<number>(0)
  const animationRef = useRef<number>(0)
  const stateRef = useRef<GameState>(gameState)
  
  // Keep ref in sync
  useEffect(() => {
    stateRef.current = gameState
  }, [gameState])

  // Expose test functions
  useEffect(() => {
    const dirMap: Record<string, { x: number, y: number }> = {
      'up': { x: 0, y: -1 },
      'down': { x: 0, y: 1 },
      'left': { x: -1, y: 0 },
      'right': { x: 1, y: 0 },
      'u': { x: 0, y: -1 },
      'd': { x: 0, y: 1 },
      'l': { x: -1, y: 0 },
      'r': { x: 1, y: 0 },
    }
    
    window.qixTest = (commands) => {
      const testCmds: TestCommand[] = commands.map(c => ({
        direction: dirMap[c.dir.toLowerCase()] || { x: 0, y: 0 },
        frames: c.frames,
      }))
      setGameState(s => queueTestCommands(s, testCmds))
    }
    
    window.qixState = () => stateRef.current
    
    return () => {
      delete (window as any).qixTest
      delete (window as any).qixState
    }
  }, [])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const maxWidth = Math.min(rect.width - 32, 900)
      const maxHeight = Math.min(rect.height - 200, 700)
      const aspect = 4 / 3
      
      let width = maxWidth
      let height = width / aspect
      
      if (height > maxHeight) {
        height = maxHeight
        width = height * aspect
      }
      
      const newConfig = { ...DEFAULT_CONFIG, width: Math.floor(width), height: Math.floor(height) }
      setConfig(newConfig)
      setGameState(s => s.phase === 'start' ? createInitialState(newConfig) : s)
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const loop = (time: number) => {
      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 16.67, 2) : 1
      lastTimeRef.current = time
      
      setGameState(prev => {
        const newState = updateGame(prev, inputRef.current, config, dt)
        renderGame(ctx, newState, config)
        return newState
      })
      
      animationRef.current = requestAnimationFrame(loop)
    }
    
    animationRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationRef.current)
  }, [config])

  // Input handlers
  useEffect(() => {
    const keyboardHandler = createKeyboardHandler(state => {
      inputRef.current = { direction: state.direction, slowDraw: state.slowDraw }
      
      if (state.pause) {
        setGameState(s => s.phase === 'playing' ? { ...s, phase: 'paused' } : s)
      }
      if (state.start) {
        setGameState(s => {
          if (s.phase === 'start' || s.phase === 'paused') return { ...s, phase: 'playing' }
          if (s.phase === 'gameover') return { ...createInitialState(config), phase: 'playing' }
          if (s.phase === 'levelcomplete') return { ...nextLevel(s, config), phase: 'playing' }
          return s
        })
      }
    })
    
    keyboardHandler.attach()
    return () => keyboardHandler.detach()
  }, [config])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const touchHandler = createTouchHandler(state => {
      inputRef.current = { direction: state.direction, slowDraw: state.slowDraw }
      
      if (state.start) {
        setGameState(s => {
          if (s.phase === 'start' || s.phase === 'paused') return { ...s, phase: 'playing' }
          if (s.phase === 'gameover') return { ...createInitialState(config), phase: 'playing' }
          if (s.phase === 'levelcomplete') return { ...nextLevel(s, config), phase: 'playing' }
          return s
        })
      }
    })
    
    touchHandler.attach(container)
    return () => touchHandler.detach(container)
  }, [config])

  const handleStart = useCallback(() => {
    setGameState(s => {
      if (s.phase === 'start' || s.phase === 'paused') return { ...s, phase: 'playing' }
      if (s.phase === 'gameover') return { ...createInitialState(config), phase: 'playing' }
      if (s.phase === 'levelcomplete') return { ...nextLevel(s, config), phase: 'playing' }
      return s
    })
  }, [config])

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen p-4 select-none">
      <HUD state={gameState} />
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={config.width}
          height={config.height}
          className="rounded-lg shadow-2xl shadow-cyan-500/20"
          style={{ touchAction: 'none' }}
        />
        <GameOverlay state={gameState} onStart={handleStart} />
      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">
        <span className="hidden sm:inline">Arrow keys / WASD to move • Hold Shift for slow draw (2x points)</span>
        <span className="sm:hidden">Swipe to move • Two fingers for slow draw</span>
      </div>
    </div>
  )
}
