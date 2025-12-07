export interface Point {
  x: number
  y: number
}

export interface Segment {
  start: Point
  end: Point
}

export interface Player {
  pos: Point
  lastBorderPos: Point
  isDrawing: boolean
  drawSpeed: 'fast' | 'slow'
  currentPath: Point[]
  lives: number
  deathAnimation: number
  deathPause: number
}

export interface QixLine {
  start: Point
  end: Point
  age: number
}

export interface Qix {
  lines: QixLine[]
  center: Point
  velocity: Point
  angle: number
  baseSpeed: number
  time: number
  colorA: string
  colorB: string
  // Pattern multipliers for unique movement
  rotationMult: number
  translationMult: number
  lengthMult: number
}

export interface Sparx {
  pos: Point
  clockwise: boolean  // Rotational direction around polygon
  speed: number
  isSuper: boolean
}

export interface Fuse {
  active: boolean
  pos: Point
  pathIndex: number
  speed: number
}

export interface Border {
  segments: Segment[]
  points: Point[]
}

export type GamePhase = 'start' | 'playing' | 'paused' | 'dying' | 'gameover' | 'levelcomplete'

export interface GameState {
  phase: GamePhase
  level: number
  score: number
  player: Player
  qixes: Qix[]
  sparx: Sparx[]
  fuse: Fuse
  border: Border
  innerBorder: Point[] // Current polygon where Qix lives (shrinks as player claims)
  drawnSegments: Segment[] // All segments drawn by player (for display)
  totalArea: number
  claimedArea: number
  claimPercentage: number
  targetPercentage: number
  canvasWidth: number
  canvasHeight: number
  testCommands: TestCommand[]
}

export interface InputState {
  direction: Point | null
  slowDraw: boolean
}

export interface GameConfig {
  width: number
  height: number
  margin: number
  playerSpeed: number
  slowDrawMultiplier: number
  fuseSpeed: number
  sparxBaseSpeed: number
  qixBaseSpeed: number
  targetPercentage: number
  livesPerGame: number
  scale: number  // Scale factor based on canvas size vs reference (800px)
}

export interface TestCommand {
  direction: Point
  frames: number
}
