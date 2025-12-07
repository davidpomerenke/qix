import { Sparx, Point, GameConfig, Segment } from './types'

export function createSparx(config: GameConfig, level: number, count: number, playerPos: Point, edges: Segment[]): Sparx[] {
  const m = config.margin
  const w = config.width - m
  
  const spawns = [
    { pos: { x: m, y: m }, clockwise: true },      // top-left, going clockwise
    { pos: { x: w, y: m }, clockwise: true },      // top-right, going clockwise
  ]
  
  return Array.from({ length: count }, (_, i) => {
    const spawn = spawns[i % spawns.length]
    return {
      pos: { ...spawn.pos },
      clockwise: spawn.clockwise,  // Rotational direction, not world direction
      speed: config.playerSpeed * 1.2,
      isSuper: level >= 5 && i === 0,
    }
  })
}

export function updateSparx(
  sparx: Sparx[],
  walkableEdges: Segment[],
  playerPos: Point,
  config: GameConfig,
  dt: number
): Sparx[] {
  if (walkableEdges.length === 0) return sparx
  
  // Ensure polygon is clockwise - if not, we need to reverse our logic
  const isClockwise = polygonIsClockwise(walkableEdges)
  
  return sparx.map(s => {
    const newPos = moveAlongEdges(s.pos, s.speed * dt, walkableEdges, s.clockwise, isClockwise)
    return { ...s, pos: newPos }
  })
}

// Check if polygon edges are in clockwise order (for screen coordinates where Y increases downward)
function polygonIsClockwise(edges: Segment[]): boolean {
  let sum = 0
  for (const edge of edges) {
    sum += (edge.end.x - edge.start.x) * (edge.end.y + edge.start.y)
  }
  return sum > 0
}

function moveAlongEdges(
  pos: Point, 
  distance: number, 
  edges: Segment[],
  sparxClockwise: boolean,
  polygonClockwise: boolean
): Point {
  const { edgeIndex, t } = findPositionOnEdges(pos, edges)
  if (edgeIndex < 0) return pos
  
  // If sparx wants to go clockwise and polygon is clockwise, move forward through edges (toward edge.end)
  // If sparx wants to go clockwise but polygon is counter-clockwise, move backward through edges
  const moveForward = sparxClockwise === polygonClockwise
  
  let currentEdge = edgeIndex
  let currentT = Math.max(0.001, Math.min(0.999, t))
  let remaining = distance
  
  const maxIterations = edges.length * 2 + 8
  for (let iter = 0; iter < maxIterations && remaining > 0.001; iter++) {
    const edge = edges[currentEdge]
    const edgeLen = edgeLength(edge)
    
    if (edgeLen < 1) {
      // Skip tiny edges
      if (moveForward) {
        currentEdge = (currentEdge + 1) % edges.length
        currentT = 0.001
      } else {
        currentEdge = (currentEdge - 1 + edges.length) % edges.length
        currentT = 0.999
      }
      continue
    }
    
    if (moveForward) {
      const distToEnd = (1 - currentT) * edgeLen
      if (distToEnd <= remaining + 0.1) {
        remaining = Math.max(0, remaining - distToEnd)
        currentEdge = (currentEdge + 1) % edges.length
        currentT = 0.001
      } else {
        currentT = Math.min(0.999, currentT + remaining / edgeLen)
        remaining = 0
      }
    } else {
      const distToStart = currentT * edgeLen
      if (distToStart <= remaining + 0.1) {
        remaining = Math.max(0, remaining - distToStart)
        currentEdge = (currentEdge - 1 + edges.length) % edges.length
        currentT = 0.999
      } else {
        currentT = Math.max(0.001, currentT - remaining / edgeLen)
        remaining = 0
      }
    }
  }
  
  const finalEdge = edges[currentEdge]
  return {
    x: finalEdge.start.x + (finalEdge.end.x - finalEdge.start.x) * currentT,
    y: finalEdge.start.y + (finalEdge.end.y - finalEdge.start.y) * currentT,
  }
}

function edgeLength(edge: Segment): number {
  return Math.hypot(edge.end.x - edge.start.x, edge.end.y - edge.start.y)
}

function findPositionOnEdges(pos: Point, edges: Segment[]): { edgeIndex: number, t: number } {
  let bestEdge = -1
  let bestT = 0.5
  let minDist = Infinity
  
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    const { t, dist } = projectOntoSegment(pos, edge)
    if (dist < minDist) {
      minDist = dist
      bestEdge = i
      bestT = t
    }
  }
  
  return { edgeIndex: bestEdge, t: bestT }
}

function projectOntoSegment(p: Point, seg: Segment): { t: number, dist: number } {
  const dx = seg.end.x - seg.start.x
  const dy = seg.end.y - seg.start.y
  const len2 = dx * dx + dy * dy
  if (len2 < 0.01) return { t: 0.5, dist: Math.hypot(p.x - seg.start.x, p.y - seg.start.y) }
  
  const t = Math.max(0, Math.min(1, ((p.x - seg.start.x) * dx + (p.y - seg.start.y) * dy) / len2))
  const proj = { x: seg.start.x + t * dx, y: seg.start.y + t * dy }
  return { t, dist: Math.hypot(p.x - proj.x, p.y - proj.y) }
}
