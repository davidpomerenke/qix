import { GameState, Point, Segment } from './types'
import { fuseReachedPlayer } from './fuse'
import { getQixSegments } from './qix'

export function checkCollisions(state: GameState): boolean {
  const { player, qixes, sparx, fuse } = state
  
  // Check fuse collision
  if (fuse.active && fuseReachedPlayer(fuse, player.currentPath)) {
    return true
  }
  
  // Check Sparx collision with player
  for (const s of sparx) {
    if (dist(player.pos, s.pos) < 10) {
      return true
    }
  }
  
  // Check all Qixes
  for (const qix of qixes) {
    // Check Qix collision with player's current path
    if (player.isDrawing && player.currentPath.length >= 2) {
      const qixSegments = getQixSegments(qix)
      
      for (let i = 0; i < player.currentPath.length - 1; i++) {
        const pathSeg: Segment = {
          start: player.currentPath[i],
          end: player.currentPath[i + 1],
        }
        
        for (const qixSeg of qixSegments) {
          if (segmentsIntersect(pathSeg, qixSeg)) {
            return true
          }
        }
        
        // Check Qix line proximity to path
        for (const line of qix.lines) {
          if (pointToSegmentDist(line.start, pathSeg) < 6 || 
              pointToSegmentDist(line.end, pathSeg) < 6) {
            return true
          }
        }
      }
    }
    
    // Check Qix collision with player position while drawing
    if (player.isDrawing) {
      for (const line of qix.lines) {
        if (dist(player.pos, line.start) < 10 || dist(player.pos, line.end) < 10) {
          return true
        }
      }
      if (dist(player.pos, qix.center) < 12) {
        return true
      }
    }
  }
  
  return false
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function pointToSegmentDist(p: Point, seg: Segment): number {
  const dx = seg.end.x - seg.start.x
  const dy = seg.end.y - seg.start.y
  const len2 = dx * dx + dy * dy
  
  if (len2 === 0) return dist(p, seg.start)
  
  let t = ((p.x - seg.start.x) * dx + (p.y - seg.start.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  
  return dist(p, {
    x: seg.start.x + t * dx,
    y: seg.start.y + t * dy,
  })
}

function segmentsIntersect(a: Segment, b: Segment): boolean {
  const d1 = direction(b.start, b.end, a.start)
  const d2 = direction(b.start, b.end, a.end)
  const d3 = direction(a.start, a.end, b.start)
  const d4 = direction(a.start, a.end, b.end)
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  
  return false
}

function direction(a: Point, b: Point, c: Point): number {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)
}
