import Phaser from 'phaser'
import {
  SIZE,
  setTypes,
  makeBoard,
  swapCells,
  findStep,
  applyStep,
  findMove,
  shuffleBoard,
  scoreFor,
  manualStep,
  cellsOfType,
} from '../game.js'
import { sfx, audioState } from '../sound.js'
import { W, H, TEX, PALETTE, background, button, text, fade } from './common.js'
import { debris, ring, flashAt, beam, bolt, popText } from './fx.js'
import { data, persist } from './save.js'
import { REGIONS, GEM_NAMES, GEM_COLORS, levelDef, classicDef, describe, TOTAL_LEVELS } from './levels.js'
import { openTipJar } from './support.js'

const CELL = 72
const BX = (W - CELL * SIZE) / 2
const BY = 160
const BOARD_H = CELL * SIZE

const cellX = (c) => BX + c * CELL + CELL / 2
const cellY = (r) => BY + r * CELL + CELL / 2
const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
const keyOf = (r, c) => `${r},${c}`
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

const POWERS = [
  { id: 'hammer', icon: '🔨', name: 'Hammer', hint: 'Tap a gem to smash it' },
  { id: 'bomb', icon: '💣', name: 'Bomb', hint: 'Tap to blow up an area' },
  { id: 'zap', icon: '⚡', name: 'Color Zap', hint: 'Tap a gem to zap its colour' },
  { id: 'shuffle', icon: '🔀', name: 'Shuffle' },
  { id: 'extra', icon: '➕', name: 'Extra' },
]

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game')
  }

  init(cfg) {
    this.cfg = cfg
    this.mode = cfg.mode
    this.level = cfg.level || 1
  }

  defFor(level) {
    if (this.mode === 'journey') return levelDef(level)
    if (this.mode === 'classic') return classicDef(level)
    if (this.mode === 'timed') return { kind: 'blitz', types: 6, time: 60 }
    return { kind: 'zen', types: 6 }
  }

  create() {
    const region = this.mode === 'journey' ? REGIONS[levelDef(this.level).region] : null
    this.region = region
    background(this, region ? region.bg : ['#4c1d95', '#12062b'], region ? region.color : 0xffffff)
    this.cameras.main.fadeIn(250, 10, 4, 30)

    this.add.rectangle(W / 2, BY + BOARD_H / 2, BOARD_H + 20, BOARD_H + 20, 0x0a041e, 0.6).setStrokeStyle(2, 0xffffff, 0.15).setDepth(-10)

    // Opaque header: falling gems slide in from behind it.
    this.add.rectangle(W / 2, (BY - 12) / 2, W, BY - 12, 0x0e0620).setDepth(12)
    this.add.rectangle(W / 2, BY - 12, W, 3, region ? region.color : 0x8b5cf6, 0.8).setDepth(12)
    this.titleText = text(this, 20, 14, '', 22, '#fff', { fontStyle: 'bold' }).setDepth(13)
    this.scoreText = text(this, W / 2, 10, '', 38, '#fde68a', { fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(13)
    this.movesText = text(this, W - 20, 14, '', 22, '#fff', { fontStyle: 'bold' }).setOrigin(1, 0).setDepth(13)
    this.barBg = this.add.rectangle(W / 2, 92, 560, 14, 0x000000, 0.5).setDepth(13)
    this.bar = this.add.rectangle(W / 2 - 280, 92, 0, 14, 0xf9a8d4).setOrigin(0, 0.5).setDepth(13)
    this.goalText = text(this, W / 2, 120, '', 18, '#ddd6fe').setOrigin(0.5).setDepth(13)
    this.bestText = text(this, W / 2, 48, '', 14, '#a78bfa').setOrigin(0.5, 0).setDepth(13)

    this.toast = text(this, W / 2, BY + 250, '', 44, '#fde68a', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(45)

    this.powerButtons = POWERS.map((p, i) => {
      const b = button(this, 64 + i * 128, 770, '', () => this.onPower(p), { w: 116, h: 56, size: 22, color: 0x4c1d95 })
      b.setDepth(14)
      return b
    })
    button(this, 110, 830, 'Hint', () => !this.busy && this.phase === 'play' && this.showHint(), { w: 130, h: 44, size: 18, color: 0x374151 })
    this.soundBtn = button(this, 320, 830, audioState.muted ? 'Sound off' : 'Sound on', () => {
      audioState.muted = !audioState.muted
      data.muted = audioState.muted
      persist()
      this.soundBtn.setLabel(audioState.muted ? 'Sound off' : 'Sound on')
    }, { w: 150, h: 44, size: 18, color: 0x374151 })
    button(this, 530, 830, this.mode === 'journey' ? 'Map' : 'Menu', () => this.leave(), { w: 130, h: 44, size: 18, color: 0x374151 })

    this.input.on('pointermove', (p) => this.onMove(p))
    this.input.on('pointerup', () => (this.drag = null))

    this.sprites = new Map()
    this.total = 0
    this.armed = null
    this.hintTween = null
    this.timerEvent = this.time.addEvent({ delay: 100, loop: true, callback: () => this.tick() })
    this.refreshPowers()
    this.beginLevel(this.level, false)
  }

  // ---------- level lifecycle ----------

  async beginLevel(level, withBlinds) {
    this.busy = true
    this.phase = 'intro'
    if (withBlinds) await this.blinds(true)
    this.level = level
    this.def = this.defFor(level)
    setTypes(this.def.types)
    this.score = 0
    this.collected = 0
    this.moves = this.def.moves ?? 0
    this.timeLeft = this.def.time ?? 0
    this.deselect()
    this.clearHint()
    this.hintEvent?.remove()
    this.armed = null
    this.refreshPowers()
    this.panel?.destroy()
    this.panel = null
    this.sprites.forEach((s) => s.destroy())
    this.sprites.clear()
    this.board = makeBoard()
    this.refreshHud()
    if (withBlinds) await this.blinds(false)
    await this.intro()
    this.phase = 'play'
    this.board.forEach((row, r) => row.forEach((gem, c) => this.makeSprite(gem, r, c, cellY(r - SIZE - ((c * 3) % 5)))))
    sfx.whoosh()
    await this.syncBoard(this.board)
    this.busy = false
    this.resetHintTimer()
  }

  async intro() {
    const label =
      this.mode === 'timed' ? 'Timed Blitz' : this.mode === 'zen' ? 'Zen' : `Level ${this.level}`
    const sub = this.mode === 'timed' ? 'Score as much as you can in 60 seconds. Combos add time!' : this.mode === 'zen' ? 'No limits. Just match and relax.' : describe(this.def)
    sfx.whoosh()
    const band = this.add.rectangle(W / 2, BY + BOARD_H / 2, W, 170, 0x000000, 0.75).setDepth(40).setScale(1, 0)
    const color = this.region ? this.region.color : 0xf472b6
    const line = this.add.rectangle(W / 2, BY + BOARD_H / 2 - 85, W, 4, color).setDepth(41).setScale(0, 1)
    const line2 = this.add.rectangle(W / 2, BY + BOARD_H / 2 + 85, W, 4, color).setDepth(41).setScale(0, 1)
    const t1 = text(this, -300, BY + BOARD_H / 2 - 26, label, 64, '#fff', { fontStyle: 'bold', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(42)
    const t2 = text(this, W + 400, BY + BOARD_H / 2 + 36, sub, 21, '#fde68a', { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5).setDepth(42)
    const sweep = this.add.rectangle(-120, H / 2, 90, 1400, 0xffffff, 0.35).setAngle(20).setDepth(43).setBlendMode('ADD')
    await Promise.all([
      this.tween({ targets: band, scaleY: 1, duration: 220, ease: 'Back.Out' }),
      this.tween({ targets: [line, line2], scaleX: 1, duration: 300 }),
      this.tween({ targets: t1, x: W / 2, duration: 420, ease: 'Back.Out' }),
      this.tween({ targets: t2, x: W / 2, duration: 520, ease: 'Cubic.Out' }),
      this.tween({ targets: sweep, x: W + 200, duration: 700, delay: 150 }),
    ])
    await this.delay(this.mode === 'journey' || this.mode === 'classic' ? 1100 : 900)
    await Promise.all([
      this.tween({ targets: t1, x: W + 400, duration: 300, ease: 'Cubic.In' }),
      this.tween({ targets: t2, x: -400, duration: 300, ease: 'Cubic.In' }),
      this.tween({ targets: band, scaleY: 0, duration: 260, delay: 140 }),
      this.tween({ targets: [line, line2], scaleX: 0, duration: 260, delay: 140 }),
    ])
    ;[band, line, line2, t1, t2, sweep].forEach((o) => o.destroy())
  }

  // Venetian-blind wipe used between levels.
  async blinds(closing) {
    const n = 8
    const w = W / n
    const color = this.region ? this.region.color : 0x8b5cf6
    if (closing) {
      sfx.whoosh()
      this.strips = Array.from({ length: n }, (_, i) =>
        this.add.rectangle(i * w + w / 2, H / 2, w + 2, H, i % 2 ? color : 0x1b1038).setDepth(60).setScale(1, 0),
      )
      await Promise.all(this.strips.map((s, i) => this.tween({ targets: s, scaleY: 1, duration: 280, delay: i * 45, ease: 'Cubic.Out' })))
    } else {
      await Promise.all(this.strips.map((s, i) => this.tween({ targets: s, scaleX: 0, duration: 280, delay: (n - i) * 40, ease: 'Cubic.In' })))
      this.strips.forEach((s) => s.destroy())
      this.strips = null
    }
  }

  leave() {
    fade(this, this.mode === 'journey' ? 'map' : 'menu', { focus: this.level })
  }

  tick() {
    if (this.phase !== 'play' || !this.def.time) return
    this.timeLeft = Math.max(0, this.timeLeft - 0.1)
    this.refreshHud()
    if (this.timeLeft <= 0 && !this.busy) {
      if (this.def.kind === 'blitz') this.finishRun()
      else this.lose("Time's up!")
    }
  }

  // ---------- helpers ----------

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }))
  }

  delay(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve))
  }

  say(msg, color = '#fde68a') {
    this.tweens.killTweensOf(this.toast)
    this.toast.setText(msg).setColor(color).setAlpha(1).setScale(0.6).setY(BY + 250)
    this.tweens.add({ targets: this.toast, scale: 1.1, duration: 150, yoyo: true })
    this.tweens.add({ targets: this.toast, y: BY + 170, alpha: 0, delay: 600, duration: 600 })
  }

  refreshHud() {
    const d = this.def
    if (!d) return
    const title = this.mode === 'journey' ? `Level ${this.level}` : this.mode === 'classic' ? `Level ${this.level}` : this.mode === 'timed' ? 'Blitz' : 'Zen'
    this.titleText.setText(title)
    this.scoreText.setText(this.score.toLocaleString())
    if (d.time) this.movesText.setText(`⏱ ${Math.ceil(this.timeLeft)}s`).setColor(this.timeLeft <= 10 ? '#fb7185' : '#ffffff')
    else if (d.moves) this.movesText.setText(`Moves ${this.moves}`).setColor(this.moves <= 5 ? '#fb7185' : '#ffffff')
    else this.movesText.setText('')

    let pct = 0
    let goal = ''
    if (d.kind === 'score') {
      pct = this.score / d.target
      goal = `Goal: ${d.target.toLocaleString()} points`
    } else if (d.kind === 'collect') {
      pct = this.collected / d.count
      goal = `Collect ${GEM_NAMES[d.color]}: ${Math.min(this.collected, d.count)} / ${d.count}`
    } else if (d.kind === 'timed') {
      pct = this.score / d.target
      goal = `Goal: ${d.target.toLocaleString()} points`
    } else if (d.kind === 'blitz') {
      pct = this.timeLeft / d.time
      goal = 'Chain combos to add time!'
    } else {
      goal = 'Relax — no limits'
    }
    this.barBg.setVisible(d.kind !== 'zen')
    this.bar.setVisible(d.kind !== 'zen')
    this.bar.width = Math.max(0, Math.min(1, pct)) * 560
    this.bar.setFillStyle(d.kind === 'collect' ? GEM_COLORS[d.color] : d.kind === 'blitz' ? 0x38bdf8 : 0xf9a8d4)
    this.goalText.setText(goal)
    const best = this.mode === 'classic' ? data.best.classic : this.mode === 'timed' ? data.best.timed : 0
    this.bestText.setText(best ? `Best ${best.toLocaleString()}` : '')
  }

  refreshPowers() {
    POWERS.forEach((p, i) => {
      const b = this.powerButtons[i]
      const n = data.inv[p.id]
      b.setLabel(`${p.icon} ${n}`)
      b.setAlpha(n > 0 ? 1 : 0.45)
      b.setScale(this.armed === p.id ? 1.12 : 1)
    })
  }

  grant(id, n = 1) {
    data.inv[id] += n
    persist()
    this.refreshPowers()
  }

  // ---------- sprites ----------

  makeSprite(gem, r, c, y = cellY(r)) {
    const box = this.add.container(cellX(c), y)
    const scale = (CELL * 0.88) / TEX
    if (gem.special) {
      const glow = this.add.image(0, 0, 'glow').setScale(1.1).setBlendMode('ADD').setAlpha(0.7)
      box.add(glow)
      this.tweens.add({ targets: glow, alpha: 0.2, scale: 0.8, yoyo: true, repeat: -1, duration: 700 })
    }
    if (gem.special === 'rainbow') {
      const rb = this.add.image(0, 0, 'rainbow')
      box.add(rb)
      this.tweens.add({ targets: rb, angle: 360, duration: 5000, repeat: -1 })
    } else {
      box.add(this.add.image(0, 0, `gem${gem.type}`))
      const overlay = { blast: 'sp_blast', row: 'sp_row', col: 'sp_col', star: 'sp_star' }[gem.special]
      if (overlay) {
        const o = this.add.image(0, 0, overlay).setScale(gem.special === 'star' ? 0.95 : 0.9)
        box.add(o)
        if (gem.special === 'blast') this.tweens.add({ targets: o, angle: 360, duration: 4000, repeat: -1 })
        else if (gem.special === 'star') this.tweens.add({ targets: o, angle: 45, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' })
        else this.tweens.add({ targets: o, alpha: 0.45, yoyo: true, repeat: -1, duration: 500 })
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
            flashAt(this, cellX(c), cellY(r), 220)
            ring(this, cellX(c), cellY(r), 0xffffff, 70, 350, 4)
            tweens.push(this.tween({ targets: sprite, scale: sprite.baseScale, duration: 380, ease: 'Back.Out' }))
          }
        }
        sprite.row = r
        sprite.col = c
        tweens.push(this.tween({ targets: sprite, x: cellX(c), y: cellY(r), duration: 380, ease: 'Bounce.Out', delay: (c * 20) % 60 }))
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

  // ---------- hints / selection ----------

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

  select(cell) {
    if (!this.marker) this.marker = this.add.rectangle(0, 0, CELL - 6, CELL - 6).setStrokeStyle(4, 0xffffff, 0.9).setDepth(10)
    this.selected = cell
    this.marker.setPosition(cellX(cell[1]), cellY(cell[0])).setVisible(true)
  }

  deselect() {
    this.selected = null
    this.marker?.setVisible(false)
  }

  // ---------- input ----------

  onDown(box, pointer) {
    if (this.busy || this.phase !== 'play') return
    const cell = [box.row, box.col]
    if (this.armed) return this.useArmed(cell)
    this.drag = { r: box.row, c: box.col, x: pointer.x, y: pointer.y, fired: false }
    if (this.selected && adjacent(this.selected, cell)) {
      const from = this.selected
      this.drag.fired = true
      this.attemptSwap(from, cell)
    } else {
      sfx.select()
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

  // ---------- power-ups ----------

  onPower(p) {
    if (this.busy || this.phase !== 'play') return
    if (data.inv[p.id] <= 0) {
      this.say(`No ${p.name}s left`, '#fb7185')
      return
    }
    if (this.armed === p.id) {
      this.armed = null
      this.refreshPowers()
      return
    }
    this.deselect()
    this.clearHint()
    if (p.id === 'shuffle') return this.doShuffle()
    if (p.id === 'extra') return this.doExtra()
    this.armed = p.id
    this.refreshPowers()
    this.say(p.hint, '#a5f3fc')
  }

  consume(id) {
    data.inv[id]--
    persist()
    this.armed = null
    this.refreshPowers()
  }

  async doShuffle() {
    this.busy = true
    this.consume('shuffle')
    sfx.power()
    this.board = shuffleBoard(this.board)
    const tweens = []
    this.board.forEach((row, r) =>
      row.forEach((gem, c) => {
        const s = this.sprites.get(gem.id)
        s.row = r
        s.col = c
        tweens.push(this.tween({ targets: s, x: cellX(c), y: cellY(r), duration: 500, ease: 'Cubic.InOut' }))
      }),
    )
    await Promise.all(tweens)
    this.busy = false
    this.resetHintTimer()
  }

  doExtra() {
    if (this.def.kind === 'zen') return this.say('Not needed in Zen!', '#a5f3fc')
    this.consume('extra')
    sfx.power()
    if (this.def.time) {
      this.timeLeft += 10
      this.say('+10 seconds!', '#a5f3fc')
    } else {
      this.moves += 5
      this.say('+5 moves!', '#a5f3fc')
    }
    this.refreshHud()
  }

  async useArmed([r, c]) {
    const id = this.armed
    const gem = this.board[r][c]
    let keys
    if (id === 'hammer') keys = [keyOf(r, c)]
    else if (id === 'zap') keys = cellsOfType(this.board, gem.type)
    else {
      keys = []
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (Math.abs(dr) + Math.abs(dc) <= 2 && rr >= 0 && cc >= 0 && rr < SIZE && cc < SIZE) keys.push(keyOf(rr, cc))
        }
    }
    this.busy = true
    this.consume(id)
    this.clearHint()
    this.hintEvent?.remove()
    sfx.power()
    if (id === 'bomb') {
      ring(this, cellX(c), cellY(r), 0xfb923c, 220, 500, 8)
      flashAt(this, cellX(c), cellY(r), 420, 0xfb923c)
    }
    if (id === 'zap') keys.forEach((k) => bolt(this, W / 2, 40, cellX(+k.split(',')[1]), cellY(+k.split(',')[0]), PALETTE[gem.type].light))
    await this.runCascade(this.board, manualStep(this.board, keys))
    await this.afterMove()
  }

  // ---------- core turn ----------

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
    sfx.swap()
    await slide()

    const current = swapCells(this.board, a, b)
    const step = findStep(current, [a, b])
    if (!step) {
      sfx.bad()
      await slide()
      this.busy = false
      this.resetHintTimer()
      return
    }

    if (this.def.moves) this.moves--
    this.board = current
    await this.runCascade(current, step)
    await this.afterMove()
  }

  async runCascade(start, firstStep) {
    let current = start
    let step = firstStep
    let combo = 1
    while (step) {
      this.board = current
      await this.explode(step, combo)
      current = applyStep(current, step)
      this.board = current
      await this.syncBoard(current)
      combo++
      step = findStep(current)
    }
    this.board = current
    if (combo > 4) {
      const p = pickRandom(POWERS)
      this.grant(p.id)
      sfx.coin()
      popText(this, W / 2, BY + 120, `Bonus ${p.icon} ${p.name}!`, '#a5f3fc', 30)
    }
  }

  async explode(step, combo) {
    const fired = step.fired
    const big = fired.length > 0
    if (big) {
      sfx.boom(Math.min(3, fired.length))
      sfx.special()
    } else {
      sfx.match(combo)
    }
    if (combo > 1) {
      this.say(combo >= 4 ? `Amazing! x${combo}` : `Combo x${combo}!`)
      sfx.boom(0.3)
    }

    let cx = 0
    let cy = 0
    for (const g of step.gems) {
      const x = cellX(g.c)
      const y = cellY(g.r)
      cx += x
      cy += y
      debris(this, x, y, PALETTE[g.type].light, !!g.special)
      const sprite = this.sprites.get(this.board[g.r][g.c].id)
      if (sprite) this.tweens.add({ targets: sprite, scale: sprite.baseScale * 1.6, alpha: 0, angle: Phaser.Math.Between(-40, 40), duration: 260, ease: 'Quad.In' })
    }
    for (const f of step.fired) this.specialFx(f, step)
    for (const cr of step.creations) {
      flashAt(this, cellX(cr.pos[1]), cellY(cr.pos[0]), 260, PALETTE[cr.type].light)
    }

    const gained = scoreFor(step.clear.size, combo) + fired.length * 50 + step.creations.length * 20
    this.score += gained
    cx /= Math.max(1, step.gems.length)
    cy /= Math.max(1, step.gems.length)
    popText(this, cx, cy, `+${gained}`, big ? '#fde68a' : '#ffffff', big ? 36 : 28)

    const d = this.def
    if (d.kind === 'collect') this.collected += step.gems.filter((g) => g.type === d.color).length
    if (d.kind === 'blitz') {
      const bonus = (combo > 1 ? 1 : 0) + step.creations.length * 2 + fired.length
      if (bonus) {
        this.timeLeft = Math.min(99, this.timeLeft + bonus)
        popText(this, W - 70, 50, `+${bonus}s`, '#a5f3fc', 26)
      }
    }
    this.refreshHud()

    const shake = fired.length ? 0.014 + 0.004 * Math.min(fired.length, 3) : combo > 1 ? 0.004 * Math.min(combo, 4) : 0
    if (shake) this.cameras.main.shake(fired.length ? 380 : 200, shake)
    if (fired.some((f) => f.special === 'rainbow' || f.special === 'star') || combo >= 4) this.cameras.main.flash(140, 255, 255, 255)
    await this.delay(fired.length ? 420 : 300)
  }

  specialFx(f, step) {
    const x = cellX(f.c)
    const y = cellY(f.r)
    const color = PALETTE[f.type].light
    if (f.special === 'blast') {
      ring(this, x, y, 0xfb923c, 240, 520, 10)
      ring(this, x, y, 0xffffff, 150, 380, 6)
      flashAt(this, x, y, 520, 0xfb923c)
    } else if (f.special === 'row' || f.special === 'star') {
      beam(this, { x: W / 2, y, w: CELL * SIZE + 40, h: CELL * 0.9 }, color)
    }
    if (f.special === 'col' || f.special === 'star') {
      beam(this, { x, y: BY + BOARD_H / 2, w: CELL * 0.9, h: BOARD_H + 40 }, color)
    }
    if (f.special === 'star') {
      ring(this, x, y, 0xfde047, 300, 600, 10)
      flashAt(this, x, y, 600, 0xfde047)
    }
    if (f.special === 'rainbow') {
      flashAt(this, x, y, 560, 0xffffff)
      step.gems.slice(0, 26).forEach((g, i) => this.time.delayedCall(i * 12, () => bolt(this, x, y, cellX(g.c), cellY(g.r), PALETTE[g.type].light)))
    }
  }

  async afterMove() {
    const d = this.def
    const goalMet = (d.kind === 'score' || d.kind === 'timed') ? this.score >= d.target : d.kind === 'collect' ? this.collected >= d.count : false
    if (goalMet) return this.win()
    if (d.kind === 'blitz' && this.timeLeft <= 0) return this.finishRun()
    if (d.kind === 'timed' && this.timeLeft <= 0) return this.lose("Time's up!")
    if (d.moves && this.moves <= 0) return this.lose('Out of moves')
    if (!findMove(this.board)) {
      this.say('No moves — shuffling!', '#a5f3fc')
      await this.delay(500)
      this.board = shuffleBoard(this.board)
      const tweens = []
      this.board.forEach((row, r) =>
        row.forEach((gem, c) => {
          const s = this.sprites.get(gem.id)
          s.row = r
          s.col = c
          tweens.push(this.tween({ targets: s, x: cellX(c), y: cellY(r), duration: 500, ease: 'Cubic.InOut' }))
        }),
      )
      await Promise.all(tweens)
    }
    this.busy = false
    this.resetHintTimer()
  }

  // ---------- endings ----------

  starsFor() {
    const d = this.def
    const ratio = d.time ? this.timeLeft / d.time : d.moves ? this.moves / d.moves : 0
    return ratio >= 0.4 ? 3 : ratio >= 0.15 ? 2 : 1
  }

  // Bejeweled-style finale: every remaining gem shatters for bonus points.
  async celebrate() {
    sfx.win()
    this.cameras.main.flash(250, 255, 255, 255)
    const banner = text(this, W / 2, BY + BOARD_H / 2, 'LEVEL COMPLETE!', 54, '#fde68a', { fontStyle: 'bold', stroke: '#000', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(50)
      .setScale(0)
    this.tweens.add({ targets: banner, scale: 1, duration: 450, ease: 'Back.Out' })
    ring(this, W / 2, BY + BOARD_H / 2, 0xfde68a, 420, 900, 10)
    await this.delay(700)
    const cells = []
    this.board.forEach((row, r) => row.forEach((g, c) => cells.push([r, c, g])))
    Phaser.Utils.Array.Shuffle(cells)
    cells.forEach(([r, c, g], i) =>
      this.time.delayedCall(i * 22, () => {
        const sprite = this.sprites.get(g.id)
        if (!sprite?.active) return
        debris(this, cellX(c), cellY(r), PALETTE[g.type].light, true)
        ring(this, cellX(c), cellY(r), PALETTE[g.type].light, 80, 350, 4)
        this.tweens.add({ targets: sprite, scale: sprite.baseScale * 1.8, alpha: 0, duration: 220 })
        this.score += 25
        this.refreshHud()
        if (i % 6 === 0) sfx.match(Math.floor(i / 6) % 8)
        if (i % 16 === 0) this.cameras.main.shake(120, 0.008)
      }),
    )
    await this.delay(cells.length * 22 + 500)
    this.tweens.add({ targets: banner, alpha: 0, y: banner.y - 60, duration: 400 })
  }

  async win() {
    this.phase = 'won'
    this.clearHint()
    await this.celebrate()
    const stars = this.starsFor()
    this.total += this.score
    let rewards = []
    if (this.mode === 'journey') {
      const prev = data.journey.stars[this.level] || 0
      data.journey.stars[this.level] = Math.max(prev, stars)
      data.journey.unlocked = Math.min(TOTAL_LEVELS, Math.max(data.journey.unlocked, this.level + 1))
      const n = prev === 0 ? stars : 1
      for (let i = 0; i < n; i++) rewards.push(pickRandom(POWERS))
    } else {
      rewards = [pickRandom(POWERS)]
    }
    rewards.forEach((p) => (data.inv[p.id] += 1))
    this.updateBest(this.total)
    persist()
    this.refreshPowers()
    this.showPanel({ won: true, title: `Level ${this.level} Complete!`, stars, rewards })
  }

  lose(reason) {
    this.phase = 'lost'
    this.clearHint()
    sfx.lose()
    this.total += this.score
    this.updateBest(this.total)
    persist()
    this.showPanel({ won: false, title: reason })
  }

  finishRun() {
    if (this.phase !== 'play') return
    this.phase = 'over'
    this.clearHint()
    this.busy = true
    sfx.win()
    const record = this.score > data.best.timed
    this.updateBest(this.score)
    persist()
    this.showPanel({ won: true, title: "Time's up!", blitz: true, record })
  }

  updateBest(value) {
    if (this.mode === 'classic' && value > data.best.classic) data.best.classic = value
    if (this.mode === 'timed' && value > data.best.timed) data.best.timed = value
  }

  showPanel({ won, title, stars, rewards = [], blitz, record }) {
    const p = this.add.container(0, 0).setDepth(70)
    this.panel = p
    p.add(this.add.rectangle(W / 2, H / 2, W, H, 0x050210, 0.78).setInteractive())
    const card = this.add.graphics()
    card.fillStyle(0x1b1038, 1).fillRoundedRect(60, 170, W - 120, 540, 24)
    card.lineStyle(3, won ? 0xfde68a : 0xfb7185, 0.9).strokeRoundedRect(60, 170, W - 120, 540, 24)
    p.add(card)
    p.add(text(this, W / 2, 225, title, 38, won ? '#fde68a' : '#fb7185', { fontStyle: 'bold' }).setOrigin(0.5))

    if (stars) {
      for (let i = 0; i < 3; i++) {
        const s = text(this, W / 2 + (i - 1) * 90, 330, '★', 84, i < stars ? '#fde047' : '#4b3b6e').setOrigin(0.5).setScale(0)
        p.add(s)
        this.tweens.add({ targets: s, scale: 1, duration: 400, delay: 300 + i * 260, ease: 'Back.Out', onStart: () => i < stars && sfx.coin() })
      }
    }
    const info = []
    info.push(`Score ${this.score.toLocaleString()}`)
    if (this.mode === 'classic') info.push(`Total ${this.total.toLocaleString()} · Best ${data.best.classic.toLocaleString()}`)
    if (blitz) info.push(record ? '🏆 New best!' : `Best ${data.best.timed.toLocaleString()}`)
    p.add(text(this, W / 2, stars ? 400 : 330, info.join('\n'), 24, '#ddd6fe', { align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0))
    if (rewards.length) {
      p.add(text(this, W / 2, 485, `Rewards: ${rewards.map((r) => r.icon).join(' ')}`, 28, '#a5f3fc').setOrigin(0.5))
    }

    const add = (label, y, fn, color) => p.add(button(this, W / 2, y, label, fn, { w: 280, h: 52, color }))
    const journeyDone = this.level >= TOTAL_LEVELS
    if (this.mode === 'journey') {
      // Three actions need the extra room the tip jar would otherwise take, so
      // the stack starts higher and the coffee link sits under it.
      if (won && !journeyDone) add('Next level ▶', 500, () => this.beginLevel(this.level + 1, true), 0x8b5cf6)
      add(won ? 'Replay' : 'Try again', won && !journeyDone ? 554 : 545, () => this.beginLevel(this.level, true), 0x4c1d95)
      add('Back to map', won && !journeyDone ? 608 : 605, () => this.leave(), 0x374151)
    } else if (this.mode === 'classic') {
      if (won) add('Next level ▶', 545, () => this.beginLevel(this.level + 1, true), 0x8b5cf6)
      else add('Play again', 545, () => {
        this.total = 0
        this.beginLevel(1, true)
      }, 0x8b5cf6)
      add('Menu', 605, () => this.leave(), 0x374151)
    } else {
      add('Play again', 545, () => this.beginLevel(1, true), 0x8b5cf6)
      add('Menu', 605, () => this.leave(), 0x374151)
    }
    // Quiet support link: results panel only, inside the card under the actions
    // so it never sits on the power-up row, and never mid-run.
    p.add(
      button(this, W / 2, 674, '☕ Buy me a coffee', () => openTipJar(), {
        w: 280,
        h: 44,
        size: 17,
        color: 0x3b2a12,
        textColor: '#fde68a',
      }),
    )
    p.setAlpha(0)
    this.tweens.add({ targets: p, alpha: 1, duration: 300 })
  }
}
