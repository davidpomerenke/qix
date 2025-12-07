import { Fuse, Point } from './types'

export function updateFuse(fuse: Fuse, path: Point[]): Fuse {
  if (!fuse.active || path.length < 2) return fuse
  
  let newIdx = fuse.pathIndex
  let pos = { ...fuse.pos }
  let remaining = fuse.speed
  
  while (remaining > 0 && newIdx < path.length - 1) {
    const target = path[newIdx + 1]
    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist <= remaining) {
      pos = { ...target }
      newIdx++
      remaining -= dist
    } else {
      pos = {
        x: pos.x + (dx / dist) * remaining,
        y: pos.y + (dy / dist) * remaining,
      }
      remaining = 0
    }
  }
  
  return { ...fuse, pos, pathIndex: newIdx }
}

export function fuseReachedPlayer(fuse: Fuse, path: Point[]): boolean {
  return fuse.active && fuse.pathIndex >= path.length - 1
}

