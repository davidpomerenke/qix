import { GameState, GameConfig, InputState, Point, Segment, TestCommand, Qix } from './types'
import { createQix, updateQix } from './qix'
import { createSparx, updateSparx } from './sparx'
import { updateFuse } from './fuse'
import { checkCollisions } from './collision'
import { pathToSegments, isOnSegment, polygonToSegments, updateInnerBorder, calculatePolygonArea, pointInPolygon } from './territory'

export const DEFAULT_CONFIG: GameConfig = {
  width: 800,
  height: 600,
  margin: 20,
  playerSpeed: 4,
  slowDrawMultiplier: 0.5,
  fuseSpeed: 2,
  sparxBaseSpeed: 1.8,
  qixBaseSpeed: 2.0,
  targetPercentage: 75,
  livesPerGame: 3,
}

function getLevelConfig(level: number): { sparxCount: number, qixCount: number } {
  if (level === 1) return { sparxCount: 1, qixCount: 1 }
  if (level === 2) return { sparxCount: 2, qixCount: 1 }
  return { 
    sparxCount: Math.min(2 + Math.floor((level - 3) / 2), 4),
    qixCount: Math.min(2 + Math.floor((level - 3) / 3), 3)
  }
}

export function createInitialState(config: GameConfig = DEFAULT_CONFIG, level = 1): GameState {
  const m = config.margin
  const w = config.width - m
  const h = config.height - m
  const totalArea = (w - m) * (h - m)

  const innerBorder: Point[] = [
    { x: m, y: m },
    { x: w, y: m },
    { x: w, y: h },
    { x: m, y: h },
  ]

  const borderSegments = polygonToSegments(innerBorder)
  const startPos = { x: config.width / 2, y: h }
  const { sparxCount, qixCount } = getLevelConfig(level)
  
  const qixes: Qix[] = Array.from({ length: qixCount }, (_, i) => 
    createQix(config, { x: (i - (qixCount - 1) / 2) * 80, y: (i % 2) * 40 - 20 }, i)
  )

  return {
    phase: 'start',
    level,
    score: 0,
    player: {
      pos: startPos,
      lastBorderPos: { ...startPos },
      isDrawing: false,
      drawSpeed: 'fast',
      currentPath: [],
      lives: config.livesPerGame,
      deathAnimation: 0,
      deathPause: 0,
    },
    qixes,
    sparx: createSparx(config, level, sparxCount, startPos, borderSegments),
    fuse: { active: false, pos: { x: 0, y: 0 }, pathIndex: 0, speed: config.fuseSpeed },
    border: { segments: borderSegments, points: [...innerBorder] },
    innerBorder,
    drawnSegments: [],
    totalArea,
    claimedArea: 0,
    claimPercentage: 0,
    targetPercentage: config.targetPercentage,
    canvasWidth: config.width,
    canvasHeight: config.height,
    testCommands: [],
  }
}

export function updateGame(state: GameState, input: InputState, config: GameConfig, dt: number): GameState {
  if (state.phase === 'dying') return updateDyingState(state, config)
  if (state.phase !== 'playing') return state

  let newState = { ...state }
  
  // Process test commands
  let effectiveInput = input
  if (newState.testCommands.length > 0) {
    const cmd = newState.testCommands[0]
    effectiveInput = { direction: cmd.direction, slowDraw: false }
    cmd.frames--
    if (cmd.frames <= 0) newState.testCommands = newState.testCommands.slice(1)
  }

  // Cache inner border segments (computed once per frame)
  const innerSegments = polygonToSegments(newState.innerBorder)

  const dir = effectiveInput.direction
  if (dir) {
    const speed = effectiveInput.slowDraw ? config.playerSpeed * config.slowDrawMultiplier : config.playerSpeed
    const m = config.margin
    const w = config.width - m
    const h = config.height - m
    
    let newX = Math.max(m, Math.min(w, newState.player.pos.x + dir.x * speed))
    let newY = Math.max(m, Math.min(h, newState.player.pos.y + dir.y * speed))
    let newPos = { x: newX, y: newY }
    
    if (newState.player.isDrawing) {
      // DRAWING MODE: move through unclaimed area, complete when hitting border
      const nowOnBorder = isOnSegment(newPos, innerSegments, 4)
      
      newState.player = {
        ...newState.player,
        pos: newPos,
        currentPath: [...newState.player.currentPath, newPos],
      }
      
      if (nowOnBorder && newState.player.currentPath.length > 3) {
        const snappedEnd = snapToPolygon(newPos, newState.innerBorder)
        newState.player.currentPath[newState.player.currentPath.length - 1] = snappedEnd
        newState.player.pos = snappedEnd
        newState = completeDrawing(newState, config)
      }
    } else {
      // NOT DRAWING: walk along border OR enter unclaimed area to start drawing
      const targetInside = pointInPolygon(newPos, newState.innerBorder)
      const targetOutside = !targetInside && !isOnSegment(newPos, innerSegments, 3)
      
      // Check if movement is perpendicular to border (entering field vs walking along)
      const snappedCurrent = snapToPolygon(newState.player.pos, newState.innerBorder)
      const snappedTarget = snapToPolygon(newPos, newState.innerBorder)
      const movingAlongBorder = dist(snappedCurrent, snappedTarget) > speed * 0.5
      
      if (targetOutside) {
        // Trying to move into claimed area - don't move
      } else if (targetInside && !movingAlongBorder) {
        // Moving INTO the unclaimed area (perpendicular to border) - start drawing
        const borderStart = snappedCurrent
        newState.player = {
          ...newState.player,
          pos: newPos,
          isDrawing: true,
          drawSpeed: effectiveInput.slowDraw ? 'slow' : 'fast',
          currentPath: [borderStart, newPos],
        }
      } else {
        // Moving along border - snap to it
        newState.player = { 
          ...newState.player, 
          pos: snappedTarget,
          lastBorderPos: snappedTarget,
        }
      }
    }
  }

  // Update fuse when drawing but not moving
  if (newState.player.isDrawing && !dir) {
    if (!newState.fuse.active && newState.player.currentPath.length > 0) {
      newState.fuse = {
        active: true,
        pos: { ...newState.player.currentPath[0] },
        pathIndex: 0,
        speed: config.fuseSpeed,
      }
    }
    newState.fuse = updateFuse(newState.fuse, newState.player.currentPath)
  } else if (dir) {
    newState.fuse = { ...newState.fuse, active: false }
  }

  // Update qixes and sparx
  newState.qixes = newState.qixes.map(q => updateQix(q, config, newState.innerBorder, newState.drawnSegments, dt))
  newState.sparx = updateSparx(newState.sparx, innerSegments, newState.player.pos, config, dt)

  // Check collisions
  if (checkCollisions(newState)) {
    newState.phase = 'dying'
    newState.player.deathAnimation = 0
    newState.player.deathPause = 120
  }

  // Check level complete
  if (newState.claimPercentage >= newState.targetPercentage) {
    newState.phase = 'levelcomplete'
  }

  return newState
}

function snapToPolygon(pos: Point, polygon: Point[]): Point {
  let best = pos, minDist = Infinity
  
  for (let i = 0; i < polygon.length; i++) {
    const seg = { start: polygon[i], end: polygon[(i + 1) % polygon.length] }
    const snapped = closestPointOnSegment(pos, seg)
    const d = dist(pos, snapped)
    if (d < minDist) { minDist = d; best = snapped }
  }
  return best
}

function closestPointOnSegment(p: Point, seg: Segment): Point {
  const dx = seg.end.x - seg.start.x
  const dy = seg.end.y - seg.start.y
  const len2 = dx * dx + dy * dy
  if (len2 < 0.1) return { ...seg.start }
  
  const t = Math.max(0, Math.min(1, ((p.x - seg.start.x) * dx + (p.y - seg.start.y) * dy) / len2))
  return { x: seg.start.x + t * dx, y: seg.start.y + t * dy }
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function completeDrawing(state: GameState, config: GameConfig): GameState {
  const path = state.player.currentPath
  if (path.length < 2) {
    return { ...state, player: { ...state.player, isDrawing: false, currentPath: [] } }
  }
  
  const newSegments = pathToSegments(path)
  const qixCenter = state.qixes[0]?.center || { x: config.width / 2, y: config.height / 2 }
  
  const innerBorder = updateInnerBorder(
    state.innerBorder,
    path[0],
    path[path.length - 1],
    path,
    qixCenter
  )
  
  const outerArea = (config.width - config.margin * 2) * (config.height - config.margin * 2)
  const innerArea = calculatePolygonArea(innerBorder)
  const claimedArea = outerArea - innerArea
  const claimPercentage = (claimedArea / outerArea) * 100
  
  const multiplier = state.player.drawSpeed === 'slow' ? 2 : 1
  const pathLength = path.reduce((sum, p, i) => i === 0 ? 0 : sum + dist(p, path[i-1]), 0)
  
  // Only respawn sparx that are no longer on the valid border
  const playerPos = state.player.pos
  const newBorderSegments = polygonToSegments(innerBorder)
  const needsRespawn = state.sparx.filter(s => !isOnSegment(s.pos, newBorderSegments, 5))
  const farPoints = findFarPoints(playerPos, innerBorder, needsRespawn.length)
  let farIdx = 0
  const sparx = state.sparx.map(s => {
    const onBorder = isOnSegment(s.pos, newBorderSegments, 5)
    if (onBorder) return s
    return { ...s, pos: farPoints[farIdx++] || farPoints[0] }
  })
  
  return {
    ...state,
    innerBorder,
    sparx,
    drawnSegments: [...state.drawnSegments, ...newSegments],
    claimedArea,
    claimPercentage,
    score: state.score + Math.floor(pathLength * multiplier),
    player: {
      ...state.player,
      isDrawing: false,
      currentPath: [],
      lastBorderPos: { ...state.player.pos },
    },
    fuse: { ...state.fuse, active: false },
  }
}

function findFarthestPointOnBorder(playerPos: Point, border: Point[]): Point {
  return findFarPoints(playerPos, border, 1)[0]
}

// Find N points on border that are far from player and spread apart from each other
function findFarPoints(playerPos: Point, border: Point[], count: number): Point[] {
  if (border.length === 0) return [playerPos]
  if (count === 1) {
    let farthest = border[0], maxDist = 0
    for (const p of border) {
      const d = dist(playerPos, p)
      if (d > maxDist) { maxDist = d; farthest = p }
    }
    return [{ ...farthest }]
  }
  
  // For multiple points: score each vertex by distance from player minus closeness to already picked points
  const picked: Point[] = []
  
  for (let i = 0; i < count; i++) {
    let best = border[0], bestScore = -Infinity
    
    for (const p of border) {
      const playerDist = dist(playerPos, p)
      const minPickedDist = picked.length > 0 
        ? Math.min(...picked.map(pk => dist(p, pk)))
        : Infinity
      // Score: far from player + far from other sparx
      const score = playerDist + Math.min(minPickedDist, playerDist) * 0.5
      
      if (score > bestScore) { bestScore = score; best = p }
    }
    
    picked.push({ ...best })
  }
  
  return picked
}

function updateDyingState(state: GameState, config: GameConfig): GameState {
  if (state.player.deathAnimation < 1) {
    return { ...state, player: { ...state.player, deathAnimation: state.player.deathAnimation + 0.03 } }
  }
  
  if (state.player.deathPause > 0) {
    return { ...state, player: { ...state.player, deathPause: state.player.deathPause - 1 } }
  }
  
  const lives = state.player.lives - 1
  if (lives <= 0) {
    return { ...state, phase: 'gameover', player: { ...state.player, lives } }
  }
  
  // Respawn sparx at far positions from player
  const playerPos = state.player.lastBorderPos
  const farPoints = findFarPoints(playerPos, state.innerBorder, state.sparx.length)
  const sparx = state.sparx.map((s, i) => ({
    ...s,
    pos: farPoints[i] || farPoints[0],
  }))
  
  return {
    ...state,
    phase: 'playing',
    player: {
      ...state.player,
      pos: { ...state.player.lastBorderPos },
      isDrawing: false,
      currentPath: [],
      deathAnimation: 0,
      lives,
    },
    sparx,
    fuse: { ...state.fuse, active: false },
  }
}

export function nextLevel(state: GameState, config: GameConfig): GameState {
  const newState = createInitialState(config, state.level + 1)
  newState.score = state.score
  return newState
}

export function queueTestCommands(state: GameState, commands: TestCommand[]): GameState {
  return { ...state, testCommands: [...state.testCommands, ...commands] }
}
