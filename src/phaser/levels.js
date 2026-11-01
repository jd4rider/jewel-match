import { levelMoves, levelTarget } from '../game.js'

export const GEM_NAMES = ['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst', 'Diamond']
export const GEM_COLORS = [0xe11d48, 0x2563eb, 0x059669, 0xf59e0b, 0x9333ea, 0x67e8f9]

export const REGIONS = [
  { name: 'Ruby Caves', color: 0xe11d48, bg: ['#4a0a22', '#16040c'] },
  { name: 'Emerald Forest', color: 0x10b981, bg: ['#063d2c', '#04140f'] },
  { name: 'Sapphire Sea', color: 0x3b82f6, bg: ['#0b2a6b', '#050d24'] },
  { name: 'Topaz Desert', color: 0xf59e0b, bg: ['#5b3405', '#1c1002'] },
  { name: 'Amethyst Peaks', color: 0xa855f7, bg: ['#3b1275', '#12062b'] },
  { name: 'Diamond Palace', color: 0x67e8f9, bg: ['#0e4a5c', '#041a21'] },
]

export const LEVELS_PER_REGION = 8
export const TOTAL_LEVELS = REGIONS.length * LEVELS_PER_REGION

const KINDS = ['score', 'collect', 'score', 'timed', 'collect', 'score', 'timed', 'score']

export function levelDef(n) {
  const region = Math.floor((n - 1) / LEVELS_PER_REGION)
  const kind = KINDS[(n - 1) % KINDS.length]
  const types = n < 6 ? 5 : 6
  const def = { n, region, kind, types }
  if (kind === 'score') {
    def.target = 700 + n * 130
    def.moves = Math.max(16, 24 - Math.floor(n / 6))
  } else if (kind === 'collect') {
    def.color = (n * 2) % types
    def.count = 16 + Math.floor(n * 0.8)
    def.moves = Math.max(18, 26 - Math.floor(n / 8))
  } else {
    def.target = 900 + n * 140
    def.time = 60 + Math.min(30, Math.floor(n / 2))
  }
  return def
}

export const classicDef = (level) => ({ n: level, kind: 'score', types: 6, target: levelTarget(level), moves: levelMoves(level) })

export function describe(def) {
  if (def.kind === 'score') return `Score ${def.target.toLocaleString()} points in ${def.moves} moves`
  if (def.kind === 'collect') return `Collect ${def.count} ${GEM_NAMES[def.color]} gems in ${def.moves} moves`
  return `Score ${def.target.toLocaleString()} points in ${def.time} seconds`
}
