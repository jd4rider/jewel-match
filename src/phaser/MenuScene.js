import Phaser from 'phaser'
import { W, H, background, button, text, fade } from './common.js'
import { data } from './save.js'
import { TOTAL_LEVELS } from './levels.js'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu')
  }

  create() {
    background(this, ['#4c1d95', '#12062b'])
    this.cameras.main.fadeIn(300, 10, 4, 30)

    for (let i = 0; i < 6; i++) {
      const g = this.add.image(W / 2 + (i - 2.5) * 86, 130, `gem${i}`).setScale(0.8)
      this.tweens.add({ targets: g, y: 112, angle: i % 2 ? 8 : -8, duration: 1100, yoyo: true, repeat: -1, delay: i * 140, ease: 'Sine.InOut' })
    }
    const title = text(this, W / 2, 245, 'Jewel Match', 78, '#fde68a', { fontStyle: 'bold', stroke: '#7c2d12', strokeThickness: 8 }).setOrigin(0.5)
    this.tweens.add({ targets: title, scale: 1.04, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    text(this, W / 2, 310, 'Match, blast and sparkle', 22, '#ddd6fe').setOrigin(0.5)

    const stars = Object.values(data.journey.stars).reduce((a, b) => a + b, 0)
    const items = [
      { label: '🗺  Journey', sub: `${Math.min(data.journey.unlocked, TOTAL_LEVELS)}/${TOTAL_LEVELS} levels · ${stars}★`, color: 0x8b5cf6, mode: 'journey' },
      { label: '💎  Classic', sub: data.best.classic ? `Best ${data.best.classic.toLocaleString()}` : 'Endless levels', color: 0xdb2777, mode: 'classic' },
      { label: '⏱  Timed Blitz', sub: data.best.timed ? `Best ${data.best.timed.toLocaleString()}` : '60 seconds, chain combos for more time', color: 0x0891b2, mode: 'timed' },
      { label: '🧘  Zen', sub: 'No limits, no pressure', color: 0x059669, mode: 'zen' },
    ]
    items.forEach((it, i) => {
      const y = 410 + i * 100
      button(this, W / 2, y - 8, it.label, () => this.play(it.mode), { w: 400, h: 60, size: 28, color: it.color })
      text(this, W / 2, y + 36, it.sub, 15, '#c4b5fd').setOrigin(0.5)
    })

    const inv = data.inv
    text(this, W / 2, H - 78, `Power-ups  🔨 ${inv.hammer}   💣 ${inv.bomb}   ⚡ ${inv.zap}   🔀 ${inv.shuffle}   ➕ ${inv.extra}`, 20, '#a5f3fc').setOrigin(0.5)
    text(this, W / 2, H - 44, 'Match 4 → Line gem · L/T → Bomb · 2×2 → Star · 5 → Rainbow', 15, '#a78bfa').setOrigin(0.5)
  }

  play(mode) {
    fade(this, 'game', { mode, level: mode === 'journey' ? Math.min(data.journey.unlocked, TOTAL_LEVELS) : 1 })
  }
}
