import { Point } from '../game/types'

const KEY_MAP: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
}

export interface KeyboardState {
  direction: Point | null
  slowDraw: boolean
  pause: boolean
  start: boolean
}

export function createKeyboardHandler(onUpdate: (state: KeyboardState) => void) {
  const keysDown = new Set<string>()
  
  const getState = (): KeyboardState => {
    let direction: Point | null = null
    
    for (const key of keysDown) {
      const dir = KEY_MAP[key]
      if (dir) {
        direction = dir
        break
      }
    }
    
    return {
      direction,
      slowDraw: keysDown.has('ShiftLeft') || keysDown.has('ShiftRight'),
      pause: false,
      start: false,
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      onUpdate({ ...getState(), pause: true })
      return
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      onUpdate({ ...getState(), start: true })
      return
    }
    
    keysDown.add(e.code)
    onUpdate(getState())
  }
  
  const handleKeyUp = (e: KeyboardEvent) => {
    keysDown.delete(e.code)
    onUpdate(getState())
  }
  
  return {
    attach: () => {
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
    },
    detach: () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      keysDown.clear()
    },
  }
}

