import { Qix, QixLine, Point, GameConfig, Segment } from './types'
import { isOnSegment, pointInPolygon } from './territory'

const NUM_LINES = 12
const BASE_LINE_LENGTH = 45  // Will be scaled by config

// Color schemes for different Qixes
const QIX_COLORS = [
  { a: '#00ff00', b: '#ff0000' },  // Green/Red (classic)
  { a: '#00ffff', b: '#ff00ff' },  // Cyan/Magenta
  { a: '#ffff00', b: '#0088ff' },  // Yellow/Blue
  { a: '#ff8800', b: '#8800ff' },  // Orange/Purple
]

export function createQix(config: GameConfig, centerOffset: Point = { x: 0, y: 0 }, index = 0): Qix {
  const centerX = config.width / 2 + centerOffset.x
  const centerY = config.height / 2 + centerOffset.y
  const scale = config.scale || 1
  
  const initialAngle = Math.random() * Math.PI * 2
  const halfLen = (BASE_LINE_LENGTH * scale) / 2
  const colors = QIX_COLORS[index % QIX_COLORS.length]
  
  // Each Qix gets unique movement pattern multipliers
  const patternSeed = index * 0.7 + 0.8
  
  return {
    lines: [{
      start: { x: centerX - Math.cos(initialAngle) * halfLen, y: centerY - Math.sin(initialAngle) * halfLen },
      end: { x: centerX + Math.cos(initialAngle) * halfLen, y: centerY + Math.sin(initialAngle) * halfLen },
      age: 0,
    }],
    center: { x: centerX, y: centerY },
    velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
    angle: initialAngle,
    baseSpeed: config.qixBaseSpeed * (0.9 + index * 0.15),
    time: index * 100,  // Different phase
    colorA: colors.a,
    colorB: colors.b,
    rotationMult: patternSeed,
    translationMult: 1.2 - index * 0.2,
    lengthMult: 1 + index * 0.3,
  }
}

export function updateQix(
  qix: Qix,
  config: GameConfig,
  innerBorder: Point[],
  drawnSegments: Segment[],
  dt: number
): Qix {
  const time = (qix.time || 0) + dt * 0.06
  const scale = config.scale || 1
  
  // Use Qix-specific multipliers for unique patterns
  const rm = qix.rotationMult
  const tm = qix.translationMult
  const lm = qix.lengthMult
  
  const rotationTrend = Math.sin(time * 2.1 * rm) * 0.15 + Math.sin(time * 0.7 * rm) * 0.08
  const translationX = (Math.sin(time * 1.3 * tm) * 1.2 + Math.sin(time * 0.4 * tm) * 0.8) * tm * scale
  const translationY = (Math.cos(time * 1.1 * tm) * 1.2 + Math.cos(time * 0.5 * tm) * 0.8) * tm * scale
  const lengthChange = (Math.sin(time * 0.9 * lm) * 5 + Math.sin(time * 2.5 * lm) * 3) * lm * scale
  
  const newestLine = qix.lines[0]
  if (!newestLine) return createQix(config, { x: 0, y: 0 }, 0)
  
  const centerX = (newestLine.start.x + newestLine.end.x) / 2
  const centerY = (newestLine.start.y + newestLine.end.y) / 2
  const currentAngle = Math.atan2(newestLine.end.y - newestLine.start.y, newestLine.end.x - newestLine.start.x)
  const currentLength = Math.hypot(newestLine.end.x - newestLine.start.x, newestLine.end.y - newestLine.start.y)
  
  const newAngle = currentAngle + rotationTrend
  const newLength = Math.max(20 * scale, Math.min(70 * scale, currentLength + lengthChange * 0.1))
  let newCenterX = centerX + translationX * qix.baseSpeed
  let newCenterY = centerY + translationY * qix.baseSpeed
  
  // Bounce off inner border
  if (innerBorder.length >= 3 && !pointInPolygon({ x: newCenterX, y: newCenterY }, innerBorder)) {
    newCenterX = centerX
    newCenterY = centerY
  }
  
  const margin = config.margin + newLength / 2 + 10 * scale
  newCenterX = Math.max(margin, Math.min(config.width - margin, newCenterX))
  newCenterY = Math.max(margin, Math.min(config.height - margin, newCenterY))
  
  if (drawnSegments.length > 0 && isOnSegment({ x: newCenterX, y: newCenterY }, drawnSegments, 15 * scale)) {
    newCenterX = centerX
    newCenterY = centerY
  }
  
  const halfLen = newLength / 2
  const newLine: QixLine = {
    start: { x: newCenterX - Math.cos(newAngle) * halfLen, y: newCenterY - Math.sin(newAngle) * halfLen },
    end: { x: newCenterX + Math.cos(newAngle) * halfLen, y: newCenterY + Math.sin(newAngle) * halfLen },
    age: 0,
  }
  
  return {
    ...qix,
    lines: [newLine, ...qix.lines.map((l, i) => ({ ...l, age: i + 1 }))].slice(0, NUM_LINES),
    center: { x: newCenterX, y: newCenterY },
    angle: newAngle,
    time,
  }
}

export const getQixSegments = (qix: Qix): Segment[] =>
  qix.lines.map(l => ({ start: l.start, end: l.end }))
