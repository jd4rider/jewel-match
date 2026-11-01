import Phaser from 'phaser'
import { W, H, button, text, fade } from './common.js'
import { data } from './save.js'
import { REGIONS, LEVELS_PER_REGION, TOTAL_LEVELS, levelDef, describe, GEM_COLORS } from './levels.js'

const STEP = 120
const WORLD_H = TOTAL_LEVELS * STEP + 420
const nodeX = (i) => W / 2 + Math.sin(i * 0.8) * 190
const nodeY = (i) => WORLD_H - 220 - (i - 1) * STEP
const hex = (s) => Phaser.Display.Color.HexStringToColor(s).color

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('map')
  }

  init(d) {
    this.focus = d?.focus
  }

  create() {
    const cam = this.cameras.main
    cam.setBounds(0, 0, W, WORLD_H)
    cam.fadeIn(300, 10, 4, 30)
    this.dragDist = 0
    this.briefing = null

    REGIONS.forEach((reg, ri) => {
      const top = ri === REGIONS.length - 1 ? 0 : nodeY((ri + 1) * LEVELS_PER_REGION) - STEP * 0.8
      const bottom = ri === 0 ? WORLD_H : nodeY(ri * LEVELS_PER_REGION + 1) + STEP * 0.9
      this.add.rectangle(W / 2, (top + bottom) / 2, W, bottom - top, hex(reg.bg[0])).setDepth(-10)
      this.add.rectangle(W / 2, top, W, 6, reg.color, 0.8).setDepth(-9)
      text(this, W / 2, top + 50, reg.name, 44, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.28).setDepth(-8)
      for (let k = 0; k < 7; k++) {
        const gi = ri % 6
        this.add
          .image(Phaser.Math.Between(30, W - 30), Phaser.Math.Between(top + 80, bottom - 40), `gem${gi}`)
          .setAlpha(0.12)
          .setScale(Phaser.Math.FloatBetween(0.5, 1.2))
          .setAngle(Phaser.Math.Between(-30, 30))
          .setDepth(-7)
      }
    })

    const path = this.add.graphics().setDepth(-5)
    const done = this.add.graphics().setDepth(-4)
    const unlocked = Math.min(data.journey.unlocked, TOTAL_LEVELS)
    const pts = []
    for (let i = 1; i <= TOTAL_LEVELS; i += 0.1) pts.push({ i, x: nodeX(i), y: nodeY(i) })
    path.lineStyle(12, 0xffffff, 0.12).strokePoints(pts, false)
    done.lineStyle(12, 0xfde68a, 0.6).strokePoints(pts.filter((p) => p.i <= unlocked), false)

    for (let n = 1; n <= TOTAL_LEVELS; n++) this.makeNode(n, unlocked)

    this.input.on('pointerdown', () => (this.dragDist = 0))
    this.input.on('pointermove', (p) => {
      if (!p.isDown || this.briefing) return
      const dy = p.y - p.prevPosition.y
      this.dragDist += Math.abs(dy) + Math.abs(p.x - p.prevPosition.x)
      cam.scrollY -= dy
    })
    this.input.on('wheel', (_p, _o, _dx, dy) => !this.briefing && (cam.scrollY += dy))

    // fixed header
    const fixed = (o) => o.setScrollFactor(0).setDepth(100)
    fixed(this.add.rectangle(W / 2, 36, W, 72, 0x0e0620, 0.92))
    fixed(text(this, W / 2, 22, 'Journey', 30, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5))
    const inv = data.inv
    fixed(text(this, W / 2, 52, `🔨 ${inv.hammer}  💣 ${inv.bomb}  ⚡ ${inv.zap}  🔀 ${inv.shuffle}  ➕ ${inv.extra}`, 15, '#a5f3fc').setOrigin(0.5))
    fixed(button(this, 70, 36, '◀ Menu', () => fade(this, 'menu'), { w: 110, h: 40, size: 16, color: 0x374151 }))
    const stars = Object.values(data.journey.stars).reduce((a, b) => a + b, 0)
    fixed(text(this, W - 20, 36, `${stars} ★`, 24, '#fde047', { fontStyle: 'bold' }).setOrigin(1, 0.5))

    const target = this.focus || unlocked
    cam.scrollY = nodeY(target) - H / 2
  }

  makeNode(n, unlocked) {
    const def = levelDef(n)
    const reg = REGIONS[def.region]
    const x = nodeX(n)
    const y = nodeY(n)
    const open = n <= unlocked
    const stars = data.journey.stars[n] || 0
    const box = this.add.container(x, y).setDepth(5)
    const fill = open ? reg.color : 0x3b3355
    box.add(this.add.circle(0, 0, 38, 0x000000, 0.35).setPosition(0, 5))
    box.add(this.add.circle(0, 0, 36, fill).setStrokeStyle(4, 0xffffff, open ? 0.9 : 0.25))
    box.add(text(this, 0, -2, String(n), 28, open ? '#fff' : '#8b7fb0', { fontStyle: 'bold' }).setOrigin(0.5))
    const badge = def.kind === 'timed' ? '⏱' : def.kind === 'collect' ? '💎' : ''
    if (badge && open) box.add(text(this, 30, -30, badge, 18).setOrigin(0.5))
    for (let s = 0; s < 3; s++) {
      box.add(text(this, (s - 1) * 22, 50, '★', 22, s < stars ? '#fde047' : '#4b3b6e').setOrigin(0.5))
    }
    if (n === unlocked) {
      const pulse = this.add.circle(x, y, 40).setStrokeStyle(4, 0xffffff, 0.9).setDepth(4)
      this.tweens.add({ targets: pulse, scale: 1.5, alpha: 0, duration: 1200, repeat: -1 })
      const marker = this.add.image(x, y - 68, `gem${def.region % 6}`).setScale(0.6).setDepth(6)
      this.tweens.add({ targets: marker, y: y - 82, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    }
    if (open) {
      box.setSize(84, 84).setInteractive({ useHandCursor: true })
      box.on('pointerup', () => this.dragDist < 12 && !this.briefing && this.openBriefing(n))
    }
  }

  openBriefing(n) {
    const def = levelDef(n)
    const reg = REGIONS[def.region]
    const stars = data.journey.stars[n] || 0
    const p = this.add.container(0, 0).setScrollFactor(0).setDepth(110)
    this.briefing = p
    p.add(this.add.rectangle(W / 2, H / 2, W, H, 0x050210, 0.7).setInteractive())
    const card = this.add.graphics()
    card.fillStyle(0x1b1038, 1).fillRoundedRect(70, 250, W - 140, 380, 24)
    card.lineStyle(3, reg.color, 1).strokeRoundedRect(70, 250, W - 140, 380, 24)
    p.add(card)
    p.add(text(this, W / 2, 295, `Level ${n}`, 40, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5))
    p.add(text(this, W / 2, 337, reg.name, 20, '#c4b5fd').setOrigin(0.5))
    if (def.kind === 'collect') p.add(this.add.image(W / 2, 400, `gem${def.color}`).setScale(0.6))
    p.add(text(this, W / 2, def.kind === 'collect' ? 455 : 415, describe(def), 22, '#fff', { align: 'center', wordWrap: { width: 380 } }).setOrigin(0.5))
    p.add(text(this, W / 2, 500, [0, 1, 2].map((s) => (s < stars ? '★' : '☆')).join(' '), 40, '#fde047').setOrigin(0.5))
    p.add(button(this, W / 2, 560, 'Play', () => fade(this, 'game', { mode: 'journey', level: n }), { w: 200, h: 54, color: GEM_COLORS[def.region % 6] }))
    p.add(button(this, W / 2 + 0, 612, 'Close', () => {
      p.destroy()
      this.briefing = null
    }, { w: 120, h: 34, size: 16, color: 0x374151 }))
    p.setAlpha(0)
    this.tweens.add({ targets: p, alpha: 1, duration: 180 })
  }
}
