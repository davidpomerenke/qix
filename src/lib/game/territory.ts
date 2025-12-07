import { Point, Segment } from './types'

export const pathToSegments = (path: Point[]): Segment[] =>
  path.slice(0, -1).map((p, i) => ({ start: p, end: path[i + 1] }))

export const polygonToSegments = (polygon: Point[]): Segment[] =>
  polygon.map((p, i) => ({ start: p, end: polygon[(i + 1) % polygon.length] }))

export function isOnSegment(pos: Point, segments: Segment[], tolerance = 3): boolean {
  for (const seg of segments) {
    if (pointOnSegment(pos, seg, tolerance)) return true
  }
  return false
}

function pointOnSegment(p: Point, seg: Segment, tolerance: number): boolean {
  const d1 = dist(p, seg.start)
  const d2 = dist(p, seg.end)
  const segLen = dist(seg.start, seg.end)
  if (segLen < 0.1) return d1 < tolerance
  return Math.abs(d1 + d2 - segLen) < tolerance
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

export function calculatePolygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y
  }
  return Math.abs(area / 2)
}

// Find where a point lies on the polygon boundary
// Returns { edgeIndex, t } where t is [0,1] parameter along that edge
function findPointOnPolygon(point: Point, polygon: Point[]): { edgeIndex: number, t: number } {
  let bestEdge = 0
  let bestT = 0
  let minDist = Infinity

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const { t, dist: d } = projectPointOnSegment(point, a, b)
    if (d < minDist) {
      minDist = d
      bestEdge = i
      bestT = t
    }
  }
  return { edgeIndex: bestEdge, t: bestT }
}

function projectPointOnSegment(p: Point, a: Point, b: Point): { t: number, dist: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 < 0.01) return { t: 0, dist: dist(p, a) }
  
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  const proj = { x: a.x + t * dx, y: a.y + t * dy }
  return { t, dist: dist(p, proj) }
}

export function updateInnerBorder(
  polygon: Point[],
  pathStart: Point,
  pathEnd: Point,
  path: Point[],
  qixCenter: Point
): Point[] {
  if (path.length < 2 || polygon.length < 3) return polygon

  // Find where path endpoints intersect polygon
  const startLoc = findPointOnPolygon(pathStart, polygon)
  const endLoc = findPointOnPolygon(pathEnd, polygon)

  // Insert path endpoints into polygon, creating new vertex list
  // This splits the polygon at the intersection points
  const { newPolygon, startIdx, endIdx } = insertPathEndpoints(
    polygon, startLoc, endLoc, pathStart, pathEnd
  )

  // Build two candidate polygons
  const n = newPolygon.length
  
  // Candidate 1: from startIdx, follow path to endIdx, then follow polygon back to startIdx (forward direction)
  const cand1 = buildCandidate(newPolygon, startIdx, endIdx, path, true)
  
  // Candidate 2: from startIdx, follow path to endIdx, then follow polygon back to startIdx (backward direction)  
  const cand2 = buildCandidate(newPolygon, startIdx, endIdx, path, false)

  // Keep the one containing the Qix
  const qixIn1 = pointInPolygon(qixCenter, cand1)
  const qixIn2 = pointInPolygon(qixCenter, cand2)

  if (qixIn1 && !qixIn2) return cleanPolygon(cand1)
  if (qixIn2 && !qixIn1) return cleanPolygon(cand2)
  
  // Fallback: keep larger (shouldn't happen in normal gameplay)
  return cleanPolygon(calculatePolygonArea(cand1) > calculatePolygonArea(cand2) ? cand1 : cand2)
}

function insertPathEndpoints(
  polygon: Point[],
  startLoc: { edgeIndex: number, t: number },
  endLoc: { edgeIndex: number, t: number },
  pathStart: Point,
  pathEnd: Point
): { newPolygon: Point[], startIdx: number, endIdx: number } {
  // Build new polygon with path endpoints inserted at correct positions
  const result: Point[] = []
  let startIdx = -1
  let endIdx = -1

  // Determine insertion order (which comes first when traversing polygon)
  const startFirst = startLoc.edgeIndex < endLoc.edgeIndex ||
    (startLoc.edgeIndex === endLoc.edgeIndex && startLoc.t < endLoc.t)

  const first = startFirst ? { loc: startLoc, pt: pathStart } : { loc: endLoc, pt: pathEnd }
  const second = startFirst ? { loc: endLoc, pt: pathEnd } : { loc: startLoc, pt: pathStart }

  for (let i = 0; i < polygon.length; i++) {
    result.push({ ...polygon[i] })

    // Insert first point if on this edge
    if (i === first.loc.edgeIndex && first.loc.t > 0.001 && first.loc.t < 0.999) {
      result.push({ ...first.pt })
      if (startFirst) startIdx = result.length - 1
      else endIdx = result.length - 1
    }
    
    // Insert second point if on this edge (handle same edge case)
    if (i === second.loc.edgeIndex && second.loc.t > 0.001 && second.loc.t < 0.999) {
      result.push({ ...second.pt })
      if (startFirst) endIdx = result.length - 1
      else startIdx = result.length - 1
    }
  }

  // If points were at vertices (t ≈ 0 or t ≈ 1), find their indices
  if (startIdx < 0) startIdx = findNearestVertexIdx(pathStart, result)
  if (endIdx < 0) endIdx = findNearestVertexIdx(pathEnd, result)

  return { newPolygon: result, startIdx, endIdx }
}

function findNearestVertexIdx(p: Point, polygon: Point[]): number {
  let minD = Infinity, idx = 0
  for (let i = 0; i < polygon.length; i++) {
    const d = dist(p, polygon[i])
    if (d < minD) { minD = d; idx = i }
  }
  return idx
}

function buildCandidate(
  polygon: Point[],
  startIdx: number,
  endIdx: number,
  path: Point[],
  forwardOnPolygon: boolean
): Point[] {
  const result: Point[] = []
  const n = polygon.length

  // Add path (from start to end)
  for (const p of path) result.push({ ...p })

  // Add polygon vertices from endIdx back to startIdx
  if (forwardOnPolygon) {
    // Go forward: endIdx+1, endIdx+2, ... until we reach startIdx
    let i = (endIdx + 1) % n
    while (i !== startIdx) {
      result.push({ ...polygon[i] })
      i = (i + 1) % n
    }
  } else {
    // Go backward: endIdx-1, endIdx-2, ... until we reach startIdx
    let i = (endIdx - 1 + n) % n
    while (i !== startIdx) {
      result.push({ ...polygon[i] })
      i = (i - 1 + n) % n
    }
  }

  return result
}

// Remove duplicate/collinear points
function cleanPolygon(polygon: Point[]): Point[] {
  if (polygon.length < 3) return polygon
  
  const result: Point[] = []
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i]
    const prev = result.length > 0 ? result[result.length - 1] : polygon[polygon.length - 1]
    
    // Skip if duplicate
    if (dist(curr, prev) < 0.5) continue
    
    result.push(curr)
  }
  
  // Remove collinear points
  const final: Point[] = []
  for (let i = 0; i < result.length; i++) {
    const prev = result[(i - 1 + result.length) % result.length]
    const curr = result[i]
    const next = result[(i + 1) % result.length]
    
    if (!isCollinear(prev, curr, next)) {
      final.push(curr)
    }
  }
  
  return final.length >= 3 ? final : result
}

function isCollinear(a: Point, b: Point, c: Point): boolean {
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  return Math.abs(cross) < 1
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}
