import { Point } from '../game/types'

export interface TouchState {
  direction: Point | null
  slowDraw: boolean
  start: boolean
}

const SWIPE_THRESHOLD = 20

export function createTouchHandler(onUpdate: (state: TouchState) => void) {
  let touchStart: Point | null = null
  let lockedDirection: Point | null = null  // Persists after touch ends
  let isTwoFingerTouch = false
  let lastTap = 0
  
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length >= 2) {
      isTwoFingerTouch = true
      onUpdate({ direction: lockedDirection, slowDraw: true, start: false })
    } else {
      isTwoFingerTouch = false
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      
      // Double tap to start
      const now = Date.now()
      if (now - lastTap < 300) {
        onUpdate({ direction: lockedDirection, slowDraw: false, start: true })
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
      // Snap to cardinal direction (no diagonals)
      if (Math.abs(dx) > Math.abs(dy)) {
        lockedDirection = { x: dx > 0 ? 1 : -1, y: 0 }
      } else {
        lockedDirection = { x: 0, y: dy > 0 ? 1 : -1 }
      }
      
      // Reset touch start for next swipe detection
      touchStart = { x: touch.clientX, y: touch.clientY }
      
      onUpdate({
        direction: lockedDirection,
        slowDraw: isTwoFingerTouch || e.touches.length >= 2,
        start: false,
      })
    }
  }
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      touchStart = null
      isTwoFingerTouch = false
      // Keep lockedDirection! Player continues moving
      onUpdate({ direction: lockedDirection, slowDraw: false, start: false })
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
