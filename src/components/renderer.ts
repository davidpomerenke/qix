import { GameState, GameConfig, Qix } from '@/lib/game/types'

const COLORS = {
  bg: '#0a0a0a',
  grid: 'rgba(0, 255, 255, 0.02)',
  border: '#00ffff',
  borderGlow: 'rgba(0, 255, 255, 0.3)',
  claimed: 'rgba(0, 100, 150, 0.3)',
  innerBorder: 'rgba(0, 200, 255, 0.6)',
  drawnLine: '#00ddff',
  player: '#00ff88',
  playerGlow: 'rgba(0, 255, 136, 0.5)',
  path: '#ffff00',
  pathGlow: 'rgba(255, 255, 0, 0.3)',
  sparx: '#ff4444',
  sparxGlow: 'rgba(255, 68, 68, 0.5)',
  fuse: '#ff8800',
  fuseGlow: 'rgba(255, 136, 0, 0.5)',
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, config: GameConfig) {
  const { width, height, scale } = config
  const m = config.margin
  
  // Background
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)
  
  // Grid
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  const gridSize = 40 * scale
  for (let x = m; x <= width - m; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, m)
    ctx.lineTo(x, height - m)
    ctx.stroke()
  }
  for (let y = m; y <= height - m; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(m, y)
    ctx.lineTo(width - m, y)
    ctx.stroke()
  }
  
  // Fill claimed area
  if (state.innerBorder.length >= 3) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(m, m, width - m * 2, height - m * 2)
    ctx.moveTo(state.innerBorder[0].x, state.innerBorder[0].y)
    for (let i = state.innerBorder.length - 1; i >= 0; i--) {
      ctx.lineTo(state.innerBorder[i].x, state.innerBorder[i].y)
    }
    ctx.closePath()
    ctx.fillStyle = COLORS.claimed
    ctx.fill('evenodd')
    ctx.restore()
  }
  
  // Draw inner border
  if (state.innerBorder.length >= 3) {
    ctx.strokeStyle = COLORS.innerBorder
    ctx.lineWidth = 2 * scale
    ctx.beginPath()
    ctx.moveTo(state.innerBorder[0].x, state.innerBorder[0].y)
    for (let i = 1; i < state.innerBorder.length; i++) {
      ctx.lineTo(state.innerBorder[i].x, state.innerBorder[i].y)
    }
    ctx.closePath()
    ctx.stroke()
  }
  
  // Outer border
  ctx.shadowColor = COLORS.borderGlow
  ctx.shadowBlur = 10 * scale
  ctx.strokeStyle = COLORS.border
  ctx.lineWidth = 2 * scale
  ctx.strokeRect(m, m, width - m * 2, height - m * 2)
  ctx.shadowBlur = 0
  
  // Draw completed lines
  if (state.drawnSegments.length > 0) {
    ctx.strokeStyle = COLORS.drawnLine
    ctx.lineWidth = 2 * scale
    ctx.lineCap = 'round'
    for (const seg of state.drawnSegments) {
      ctx.beginPath()
      ctx.moveTo(seg.start.x, seg.start.y)
      ctx.lineTo(seg.end.x, seg.end.y)
      ctx.stroke()
    }
  }
  
  // Current drawing path
  if (state.player.isDrawing && state.player.currentPath.length > 1) {
    ctx.shadowColor = COLORS.pathGlow
    ctx.shadowBlur = 8 * scale
    ctx.strokeStyle = COLORS.path
    ctx.lineWidth = 2 * scale
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(state.player.currentPath[0].x, state.player.currentPath[0].y)
    for (const p of state.player.currentPath) {
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  }
  
  // Fuse
  if (state.fuse.active) {
    ctx.shadowColor = COLORS.fuseGlow
    ctx.shadowBlur = 12 * scale
    ctx.fillStyle = COLORS.fuse
    ctx.beginPath()
    ctx.arc(state.fuse.pos.x, state.fuse.pos.y, 5 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  
  // Qixes
  for (const qix of state.qixes) {
    renderQix(ctx, qix, scale)
  }
  
  // Sparx
  for (const sparx of state.sparx) {
    ctx.shadowColor = COLORS.sparxGlow
    ctx.shadowBlur = 10 * scale
    ctx.fillStyle = sparx.isSuper ? '#ff0000' : COLORS.sparx
    ctx.beginPath()
    ctx.arc(sparx.pos.x, sparx.pos.y, (sparx.isSuper ? 6 : 4) * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  
  // Player
  renderPlayer(ctx, state, config)
}

function renderQix(ctx: CanvasRenderingContext2D, qix: Qix, scale: number) {
  if (qix.lines.length === 0) return
  
  ctx.lineCap = 'round'
  ctx.lineWidth = 3 * scale
  
  for (let i = qix.lines.length - 1; i >= 0; i--) {
    const line = qix.lines[i]
    const color = i % 2 === 0 ? qix.colorA : qix.colorB
    const alpha = 1 - (line.age / qix.lines.length) * 0.3
    
    ctx.strokeStyle = color
    ctx.globalAlpha = alpha
    ctx.shadowColor = color
    ctx.shadowBlur = 6 * scale
    
    ctx.beginPath()
    ctx.moveTo(line.start.x, line.start.y)
    ctx.lineTo(line.end.x, line.end.y)
    ctx.stroke()
  }
  
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function renderPlayer(ctx: CanvasRenderingContext2D, state: GameState, config: GameConfig) {
  const { player } = state
  const { scale } = config
  const p = player.pos
  
  if (state.phase === 'dying') {
    const t = player.deathAnimation
    
    for (let i = 0; i < 4; i++) {
      const radius = (15 + t * 80 + i * 20) * scale
      const alpha = Math.max(0, 1 - t - i * 0.15)
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`
      ctx.lineWidth = (3 - i * 0.5) * scale
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    if (Math.floor(t * 15) % 2 === 0) {
      ctx.fillStyle = '#ff0000'
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 20 * scale
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 30 * scale
    }
    
    const deathScale = (1 + t * 0.5) * scale
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - 8 * deathScale)
    ctx.lineTo(p.x + 6 * deathScale, p.y + 6 * deathScale)
    ctx.lineTo(p.x - 6 * deathScale, p.y + 6 * deathScale)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    
    if (player.deathPause > 0 && t >= 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = `bold ${16 * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`Lives: ${player.lives - 1}`, config.width / 2, config.height / 2)
    }
    return
  }
  
  ctx.shadowColor = COLORS.playerGlow
  ctx.shadowBlur = 15 * scale
  ctx.fillStyle = COLORS.player
  ctx.beginPath()
  ctx.moveTo(p.x, p.y - 8 * scale)
  ctx.lineTo(p.x + 6 * scale, p.y + 6 * scale)
  ctx.lineTo(p.x - 6 * scale, p.y + 6 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  
  if (player.isDrawing && player.drawSpeed === 'slow') {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'
    ctx.font = `bold ${10 * scale}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('2X', p.x, p.y - 15 * scale)
  }
}
