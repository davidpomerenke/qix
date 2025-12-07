import { Point } from '../game/types'

export interface TouchState {
  direction: Point | null
  slowDraw: boolean
  start: boolean
}

const SWIPE_THRESHOLD = 10
const DIRECTION_THRESHOLD = 0.5

export function createTouchHandler(onUpdate: (state: TouchState) => void) {
  let touchStart: Point | null = null
  let currentDirection: Point | null = null
  let isTwoFingerTouch = false
  let lastTap = 0
  
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length >= 2) {
      isTwoFingerTouch = true
    } else {
      isTwoFingerTouch = false
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      
      // Double tap to start
      const now = Date.now()
      if (now - lastTap < 300) {
        onUpdate({ direction: null, slowDraw: false, start: true })
      }
      lastTap = now
    }
  }
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStart || e.touches.length === 0) return
    e.preventDefault()
    
    const touch = e.touches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > SWIPE_THRESHOLD) {
      const nx = dx / dist
      const ny = dy / dist
      
      // Snap to cardinal direction
      if (Math.abs(nx) > Math.abs(ny) + DIRECTION_THRESHOLD) {
        currentDirection = { x: nx > 0 ? 1 : -1, y: 0 }
      } else if (Math.abs(ny) > Math.abs(nx) + DIRECTION_THRESHOLD) {
        currentDirection = { x: 0, y: ny > 0 ? 1 : -1 }
      } else {
        currentDirection = { x: nx > 0 ? 1 : -1, y: ny > 0 ? 1 : -1 }
      }
      
      // Update start point for continuous swipe
      touchStart = { x: touch.clientX, y: touch.clientY }
      
      onUpdate({
        direction: currentDirection,
        slowDraw: isTwoFingerTouch || e.touches.length >= 2,
        start: false,
      })
    }
  }
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      touchStart = null
      currentDirection = null
      isTwoFingerTouch = false
      onUpdate({ direction: null, slowDraw: false, start: false })
    } else if (e.touches.length === 1) {
      isTwoFingerTouch = false
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }
  
  return {
    attach: (element: HTMLElement) => {
      element.addEventListener('touchstart', handleTouchStart, { passive: false })
      element.addEventListener('touchmove', handleTouchMove, { passive: false })
      element.addEventListener('touchend', handleTouchEnd, { passive: false })
    },
    detach: (element: HTMLElement) => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    },
  }
}

