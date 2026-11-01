import Phaser from 'phaser'

export const W = 640
export const H = 860
export const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
export const TEX = 96

export const PALETTE = [
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

export function makeTextures(scene) {
  const s = TEX / 100
  const pts = (arr) => {
    const out = []
    for (let k = 0; k < arr.length; k += 2) out.push(new Phaser.Math.Vector2(arr[k] * s, arr[k + 1] * s))
    return out
  }
  const make = (key, draw, size = TEX) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    draw(g)
    g.generateTexture(key, size, size)
    g.destroy()
  }

  PALETTE.forEach((p, i) =>
    make(`gem${i}`, (g) => {
      if (p.shape === 'round') {
        g.fillStyle(p.dark).fillCircle(50 * s, 50 * s, 44 * s)
        g.fillStyle(p.base).fillCircle(50 * s, 50 * s, 40 * s)
        g.fillStyle(p.light, 0.35).fillCircle(42 * s, 42 * s, 28 * s)
        g.lineStyle(3, p.light, 0.6).strokeCircle(50 * s, 50 * s, 26 * s)
        g.fillStyle(p.light, 0.5).fillCircle(50 * s, 50 * s, 10 * s)
      } else {
        g.fillStyle(p.base).fillPoints(pts(OUTLINE[p.shape]), true)
        g.lineStyle(3, p.dark).strokePoints(pts(OUTLINE[p.shape]), true)
        const inner = pts([50, 22, 70, 50, 50, 78, 30, 50])
        g.fillStyle(p.light, 0.35).fillPoints(inner, true)
        g.lineStyle(3, p.light, 0.6).strokePoints(inner, true)
      }
      g.fillStyle(0xffffff, 0.75).fillEllipse(34 * s, 28 * s, 22 * s, 12 * s)
    }),
  )

  make('sp_blast', (g) => {
    g.lineStyle(4, 0xffffff).strokeCircle(48, 48, 44)
    g.fillStyle(0xffffff).fillPoints(pts([50, 28, 57, 44, 74, 50, 57, 56, 50, 72, 43, 56, 26, 50, 43, 44]), true)
  })
  const arrows = (g, horizontal) => {
    g.fillStyle(0xffffff, 0.95)
    const body = horizontal ? [18, 44, 82, 44, 82, 56, 18, 56] : [44, 18, 56, 18, 56, 82, 44, 82]
    const a = horizontal ? [4, 50, 24, 32, 24, 68] : [50, 4, 32, 24, 68, 24]
    const b = horizontal ? [96, 50, 76, 32, 76, 68] : [50, 96, 32, 76, 68, 76]
    g.fillPoints(pts(body), true).fillPoints(pts(a), true).fillPoints(pts(b), true)
  }
  make('sp_row', (g) => arrows(g, true))
  make('sp_col', (g) => arrows(g, false))
  make('sp_star', (g) => {
    const star = []
    for (let i = 0; i < 16; i++) {
      const rad = i % 2 ? 22 : 46
      const a = (i * Math.PI) / 8 - Math.PI / 2
      star.push(50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad)
    }
    g.fillStyle(0xfde047).fillPoints(pts(star), true)
    g.lineStyle(3, 0xffffff).strokePoints(pts(star), true)
    g.fillStyle(0xffffff, 0.9).fillCircle(50 * s, 50 * s, 8 * s)
  })
  make('rainbow', (g) => {
    const c = TEX / 2
    g.fillStyle(0x1b1038).fillCircle(c, c, c - 6)
    ;[0xff4d6d, 0xffb703, 0x4ade80, 0x38bdf8, 0xa855f7].forEach((col, i) => g.lineStyle(5, col).strokeCircle(c, c, c - 12 - i * 6))
    g.fillStyle(0xffffff).fillCircle(c, c, 5)
  })
  make('spark', (g) => g.fillStyle(0xffffff).fillCircle(8, 8, 8), 16)
  make('shard', (g) => g.fillStyle(0xffffff).fillPoints([new Phaser.Math.Vector2(0, 0), new Phaser.Math.Vector2(14, 5), new Phaser.Math.Vector2(4, 14)], true), 16)

  if (!scene.textures.exists('glow')) {
    const t = scene.textures.createCanvas('glow', 128, 128)
    const ctx = t.getContext()
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
    t.refresh()
  }
}

export function background(scene, [c1, c2], tint = 0xffffff) {
  const key = `bg${c1}${c2}`
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key, 64, H)
    const ctx = t.getContext()
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, H)
    t.refresh()
  }
  scene.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(-100).setScrollFactor(0)
  scene.add
    .particles(0, 0, 'spark', {
      x: { min: 0, max: W },
      y: H + 10,
      speedY: { min: -50, max: -15 },
      lifespan: 9000,
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.5, end: 0 },
      frequency: 260,
      tint,
    })
    .setDepth(-90)
    .setScrollFactor(0)
}

export function button(scene, x, y, label, fn, { w = 200, h = 54, size = 22, color = 0x8b5cf6, textColor = '#fff' } = {}) {
  const box = scene.add.container(x, y)
  const bg = scene.add.graphics()
  const draw = (fill, alpha) => {
    bg.clear()
    bg.fillStyle(fill, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 14)
    bg.lineStyle(2, 0xffffff, 0.3).strokeRoundedRect(-w / 2, -h / 2, w, h, 14)
  }
  draw(color, 0.9)
  const text = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: textColor }).setOrigin(0.5)
  box.add([bg, text])
  box.setSize(w, h).setInteractive({ useHandCursor: true })
  box.on('pointerover', () => draw(color, 1))
  box.on('pointerout', () => draw(color, 0.9))
  box.on('pointerdown', () => {
    scene.tweens.add({ targets: box, scale: 0.94, duration: 70, yoyo: true })
    fn()
  })
  box.setLabel = (t) => text.setText(t)
  return box
}

export const text = (scene, x, y, str, size = 22, color = '#fff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra })

export function fade(scene, to, data) {
  scene.input.enabled = false
  scene.cameras.main.fadeOut(220, 10, 4, 30)
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(to, data))
}
