import Phaser from 'phaser'
import {
  SIZE,
  makeBoard,
  swapCells,
  findStep,
  applyStep,
  findMove,
  shuffleBoard,
  scoreFor,
  levelTarget,
  levelMoves,
} from '../game.js'
import { sfx } from '../sound.js'

const W = 640
const H = 840
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
const CELL = 72
const BX = (W - CELL * SIZE) / 2
const BY = 150
const TEX = 96
const BEST_KEY = 'jewel-match-best'

const PALETTE = [
  { base: 0xe11d48, light: 0xfb7185, dark: 0x9f1239, shape: 'diamond' },
  { base: 0x2563eb, light: 0x7cb0ff, dark: 0x1e3a8a, shape: 'round' },
  { base: 0x059669, light: 0x6ee7b7, dark: 0x064e3b, shape: 'octagon' },
  { base: 0xf59e0b, light: 0xfde68a, dark: 0xb45309, shape: 'hexagon' },
  { base: 0x9333ea, light: 0xd8a8ff, dark: 0x581c87, shape: 'kite' },
  { base: 0x67e8f9, light: 0xecfeff, dark: 0x0e7490, shape: 'shield' },
]

const OUTLINE = {
  diamond: [50, 6, 90, 38, 50, 94, 10, 38],
  hexagon: [26, 10, 74, 10, 94, 50, 74, 90, 26, 90, 6, 50],
  octagon: [30, 8, 70, 8, 92, 30, 92, 70, 70, 92, 30, 92, 8, 70, 8, 30],
  kite: [50, 5, 88, 40, 66, 94, 34, 94, 12, 40],
  shield: [12, 14, 88, 14, 94, 40, 50, 95, 6, 40],
}

const cellX = (c) => BX + c * CELL + CELL / 2
const cellY = (r) => BY + r * CELL + CELL / 2
const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

class JewelScene extends Phaser.Scene {
  create() {
    this.makeTextures()
    this.level = 1
    this.total = 0
    this.best = loadBest()
    this.muted = false
    this.busy = false
    this.selected = null
    this.hintTween = null
    this.sprites = new Map()

    this.add.rectangle(W / 2, BY + (CELL * SIZE) / 2, CELL * SIZE + 20, CELL * SIZE + 20, 0x0a041e, 0.6).setStrokeStyle(2, 0xffffff, 0.15)

    this.levelText = this.add.text(20, 24, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#fff' })
    this.scoreText = this.add.text(W / 2, 24, '', { fontFamily: FONT, fontSize: '22px', color: '#fff' }).setOrigin(0.5, 0)
    this.movesText = this.add.text(W - 20, 24, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#fff' }).setOrigin(1, 0)
    this.add.rectangle(W / 2, 90, 560, 14, 0x000000, 0.4)
    this.bar = this.add.rectangle(W / 2 - 280, 90, 0, 14, 0xf9a8d4).setOrigin(0, 0.5)

    this.toast = this.add.text(W / 2, BY + 250, '', { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#fde68a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0).setDepth(20)

    this.button('Hint', 120, H - 42, () => !this.busy && this.showHint())
    this.button('Restart', 260, H - 42, () => !this.busy && this.startLevel(1, false))
    this.soundBtn = this.button('Sound on', 410, H - 42, () => {
      this.muted = !this.muted
      this.soundBtn.setText(this.muted ? 'Sound off' : 'Sound on')
    })
    this.bestText = this.add.text(540, H - 42, '', { fontFamily: FONT, fontSize: '16px', color: '#c4b5fd' }).setOrigin(0.5)

    this.input.on('pointermove', (p) => this.onMove(p))
    this.input.on('pointerup', () => (this.drag = null))
    this.startLevel(1, false)
  }

  button(label, x, y, fn) {
    const t = this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#fff', backgroundColor: '#ffffff22', padding: { x: 16, y: 9 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    t.on('pointerdown', fn)
    return t
  }

  makeTextures() {
    PALETTE.forEach((p, i) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      const s = TEX / 100
      const poly = (pts, fill, a = 1, stroke, sa = 1) => {
        const points = []
        for (let k = 0; k < pts.length; k += 2) points.push(new Phaser.Math.Vector2(pts[k] * s, pts[k + 1] * s))
        g.fillStyle(fill, a).fillPoints(points, true)
        if (stroke !== undefined) g.lineStyle(3, stroke, sa).strokePoints(points, true)
      }
      if (p.shape === 'round') {
        g.fillStyle(p.dark).fillCircle(50 * s, 50 * s, 44 * s)
        g.fillStyle(p.base).fillCircle(50 * s, 50 * s, 40 * s)
        g.fillStyle(p.light, 0.35).fillCircle(42 * s, 42 * s, 28 * s)
        g.lineStyle(3, p.light, 0.6).strokeCircle(50 * s, 50 * s, 26 * s)
        g.fillStyle(p.light, 0.5).fillCircle(50 * s, 50 * s, 10 * s)
      } else {
        poly(OUTLINE[p.shape], p.base, 1, p.dark)
        poly([50, 22, 70, 50, 50, 78, 30, 50], p.light, 0.35, p.light, 0.6)
      }
      g.fillStyle(0xffffff, 0.75).fillEllipse(34 * s, 28 * s, 22 * s, 12 * s)
      g.generateTexture(`gem${i}`, TEX, TEX)
      g.destroy()
    })

    const star = this.make.graphics({ x: 0, y: 0 }, false)
    const c = TEX / 2
    star.lineStyle(4, 0xffffff, 1).strokeCircle(c, c, c - 3)
    star.fillStyle(0xffffff, 1).fillPoints(
      [[50, 30], [56, 46], [72, 50], [56, 54], [50, 70], [44, 54], [28, 50], [44, 46]].map(([x, y]) => new Phaser.Math.Vector2((x * TEX) / 100, (y * TEX) / 100)),
      true,
    )
    star.generateTexture('blast', TEX, TEX)
    star.destroy()

    const rb = this.make.graphics({ x: 0, y: 0 }, false)
    rb.fillStyle(0x1b1038).fillCircle(c, c, c - 6)
    ;[0xff4d6d, 0xffb703, 0x4ade80, 0x38bdf8, 0xa855f7].forEach((col, i) => rb.lineStyle(5, col).strokeCircle(c, c, c - 12 - i * 6))
    rb.fillStyle(0xffffff).fillCircle(c, c, 5)
    rb.generateTexture('rainbow', TEX, TEX)
    rb.destroy()

    const sp = this.make.graphics({ x: 0, y: 0 }, false)
    sp.fillStyle(0xffffff).fillCircle(8, 8, 8)
    sp.generateTexture('spark', 16, 16)
    sp.destroy()
  }

  play(name, ...args) {
    if (!this.muted) sfx[name](...args)
  }

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }))
  }

  delay(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve))
  }

  makeSprite(gem, r, c, y = cellY(r)) {
    const box = this.add.container(cellX(c), y)
    const scale = (CELL * 0.88) / TEX
    if (gem.special === 'rainbow') {
      box.add(this.add.image(0, 0, 'rainbow'))
    } else {
      box.add(this.add.image(0, 0, `gem${gem.type}`))
      if (gem.special === 'blast') {
        const ring = this.add.image(0, 0, 'blast')
        box.add(ring)
        this.tweens.add({ targets: ring, angle: 360, duration: 4000, repeat: -1 })
      }
    }
    box.setScale(scale)
    box.baseScale = scale
    box.setSize(TEX, TEX).setInteractive({ useHandCursor: true })
    box.on('pointerdown', (p) => this.onDown(box, p))
    this.sprites.set(gem.id, box)
    return box
  }

  // Slide existing sprites to their new cells; new gems fall in from above or pop in place.
  async syncBoard(board) {
    const seen = new Set()
    const tweens = []
    board.forEach((row, r) =>
      row.forEach((gem, c) => {
        seen.add(gem.id)
        let sprite = this.sprites.get(gem.id)
        if (!sprite) {
          const isRefill = gem.drop > 0
          sprite = this.makeSprite(gem, r, c, isRefill ? cellY(r - gem.drop) : cellY(r))
          if (!isRefill) {
            sprite.setScale(0)
            tweens.push(this.tween({ targets: sprite, scale: sprite.baseScale, duration: 280, ease: 'Back.Out' }))
          }
        }
        sprite.row = r
        sprite.col = c
        tweens.push(this.tween({ targets: sprite, x: cellX(c), y: cellY(r), duration: 380, ease: 'Bounce.Out' }))
      }),
    )
    for (const [id, sprite] of this.sprites) {
      if (!seen.has(id)) {
        sprite.destroy()
        this.sprites.delete(id)
      }
    }
    await Promise.all(tweens)
  }

  startLevel(level, keepTotal) {
    this.level = level
    this.score = 0
    this.moves = levelMoves(level)
    this.target = levelTarget(level)
    if (!keepTotal) this.total = 0
    this.phase = 'play'
    this.deselect()
    this.clearHint()
    this.overlay?.destroy()
    this.overlay = null
    this.sprites.forEach((s) => s.destroy())
    this.sprites.clear()
    this.board = makeBoard()
    this.board.forEach((row, r) => row.forEach((gem, c) => this.makeSprite(gem, r, c, cellY(r - SIZE))))
    this.busy = true
    this.syncBoard(this.board).then(() => {
      this.busy = false
      this.resetHintTimer()
    })
    this.refreshHud()
  }

  refreshHud() {
    this.levelText.setText(`Level ${this.level}`)
    this.scoreText.setText(`Score ${this.score.toLocaleString()} / ${this.target.toLocaleString()}`)
    this.movesText.setText(`Moves ${this.moves}`).setColor(this.moves <= 5 ? '#fb7185' : '#ffffff')
    this.bar.width = Math.min(1, this.score / this.target) * 560
    this.bestText.setText(`Best ${this.best.toLocaleString()}`)
  }

  resetHintTimer() {
    this.hintEvent?.remove()
    this.clearHint()
    this.hintEvent = this.time.delayedCall(6000, () => !this.busy && this.phase === 'play' && this.showHint())
  }

  showHint() {
    this.clearHint()
    const move = findMove(this.board)
    if (!move) return
    this.hintTargets = move.map(([r, c]) => this.sprites.get(this.board[r][c].id))
    this.hintTween = this.tweens.add({
      targets: this.hintTargets,
      scale: this.hintTargets[0].baseScale * 1.18,
      yoyo: true,
      repeat: -1,
      duration: 380,
    })
  }

  clearHint() {
    if (!this.hintTween) return
    this.hintTween.remove()
    this.hintTargets.forEach((s) => s.active && s.setScale(s.baseScale))
    this.hintTween = null
  }

  onDown(box, pointer) {
    if (this.busy || this.phase !== 'play') return
    this.drag = { r: box.row, c: box.col, x: pointer.x, y: pointer.y, fired: false }
    const cell = [box.row, box.col]
    if (this.selected && adjacent(this.selected, cell)) {
      const from = this.selected
      this.drag.fired = true
      this.attemptSwap(from, cell)
    } else {
      this.play('select')
      this.select(cell)
    }
  }

  onMove(p) {
    const d = this.drag
    if (!d || d.fired || this.busy || this.phase !== 'play') return
    const dx = p.x - d.x
    const dy = p.y - d.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < CELL * 0.4) return
    d.fired = true
    const to = Math.abs(dx) > Math.abs(dy) ? [d.r, d.c + Math.sign(dx)] : [d.r + Math.sign(dy), d.c]
    if (to[0] >= 0 && to[1] >= 0 && to[0] < SIZE && to[1] < SIZE) this.attemptSwap([d.r, d.c], to)
  }

  select(cell) {
    if (!this.marker) this.marker = this.add.rectangle(0, 0, CELL - 6, CELL - 6).setStrokeStyle(4, 0xffffff, 0.9).setDepth(10)
    this.selected = cell
    this.marker.setPosition(cellX(cell[1]), cellY(cell[0])).setVisible(true)
  }

  deselect() {
    this.selected = null
    this.marker?.setVisible(false)
  }

  showToast(msg) {
    this.tweens.killTweensOf(this.toast)
    this.toast.setText(msg).setAlpha(1).setScale(0.6).setY(BY + 250)
    this.tweens.add({ targets: this.toast, scale: 1.1, duration: 150, yoyo: true })
    this.tweens.add({ targets: this.toast, y: BY + 170, alpha: 0, delay: 500, duration: 600 })
  }

  burst(step) {
    for (const k of step.clear) {
      const [r, c] = k.split(',').map(Number)
      const gem = this.board[r][c]
      const sprite = this.sprites.get(gem.id)
      if (!sprite) continue
      const emitter = this.add.particles(cellX(c), cellY(r), 'spark', {
        speed: { min: 80, max: 260 },
        scale: { start: 0.55, end: 0 },
        lifespan: 520,
        tint: gem.special ? 0xffffff : PALETTE[gem.type].light,
        emitting: false,
        blendMode: 'ADD',
      })
      emitter.explode(10)
      this.time.delayedCall(700, () => emitter.destroy())
      this.tweens.add({ targets: sprite, scale: sprite.baseScale * 1.5, alpha: 0, duration: 260, ease: 'Quad.In' })
    }
  }

  async attemptSwap(a, b) {
    if (this.busy || this.phase !== 'play') return
    this.busy = true
    this.deselect()
    this.clearHint()
    this.hintEvent?.remove()

    const sa = this.sprites.get(this.board[a[0]][a[1]].id)
    const sb = this.sprites.get(this.board[b[0]][b[1]].id)
    const slide = () =>
      Promise.all([
        this.tween({ targets: sa, x: sb.x, y: sb.y, duration: 200, ease: 'Sine.InOut' }),
        this.tween({ targets: sb, x: sa.x, y: sa.y, duration: 200, ease: 'Sine.InOut' }),
      ])
    this.play('swap')
    await slide()

    let current = swapCells(this.board, a, b)
    let step = findStep(current, [a, b])
    if (!step) {
      this.play('bad')
      await slide()
      this.busy = false
      this.resetHintTimer()
      return
    }

    this.moves--
    let combo = 1
    while (step) {
      this.board = current
      const special = step.creations.length > 0 || step.clear.size > 5
      this.play(special ? 'special' : 'match', combo)
      if (combo > 1) this.showToast(`Combo x${combo}!`)
      if (combo > 1 || special) this.cameras.main.shake(180, 0.004 * Math.min(combo, 4))
      this.burst(step)
      this.score += scoreFor(step.clear.size, combo)
      this.refreshHud()
      await this.delay(280)
      current = applyStep(current, step)
      this.board = current
      await this.syncBoard(current)
      combo++
      step = findStep(current)
    }
    this.board = current

    if (this.score >= this.target) {
      this.score += this.moves * 50
      this.total += this.score
      this.finish()
      this.play('win')
      this.endOverlay(true)
    } else if (this.moves <= 0) {
      this.total += this.score
      this.finish()
      this.play('lose')
      this.endOverlay(false)
    } else {
      if (!findMove(current)) {
        this.showToast('Shuffling!')
        await this.delay(600)
        this.board = shuffleBoard(current)
        this.board.forEach((row, r) =>
          row.forEach((gem, c) => {
            const s = this.sprites.get(gem.id)
            s.row = r
            s.col = c
            this.tweens.add({ targets: s, x: cellX(c), y: cellY(r), duration: 400 })
          }),
        )
        await this.delay(450)
      }
      this.resetHintTimer()
    }
    this.refreshHud()
    this.busy = false
  }

  finish() {
    if (this.total > this.best) {
      this.best = this.total
      try {
        localStorage.setItem(BEST_KEY, String(this.best))
      } catch {
        // storage unavailable
      }
    }
  }

  endOverlay(won) {
    this.phase = won ? 'won' : 'lost'
    const o = this.add.container(0, 0).setDepth(30)
    o.add(this.add.rectangle(W / 2, BY + (CELL * SIZE) / 2, CELL * SIZE + 20, CELL * SIZE + 20, 0x0a041e, 0.85).setInteractive())
    o.add(this.add.text(W / 2, 330, won ? `Level ${this.level} complete!` : 'Out of moves', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5))
    o.add(this.add.text(W / 2, 395, `Total ${this.total.toLocaleString()} · Best ${this.best.toLocaleString()}`, { fontFamily: FONT, fontSize: '22px', color: '#ddd6fe' }).setOrigin(0.5))
    const btn = this.add
      .text(W / 2, 480, won ? 'Next level' : 'Try again', { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#fff', backgroundColor: '#8b5cf6', padding: { x: 28, y: 12 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    btn.on('pointerdown', () => (won ? this.startLevel(this.level + 1, true) : this.startLevel(1, false)))
    o.add(btn)
    this.overlay = o
  }
}

export function startGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#1b1038',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: JewelScene,
  })
}
