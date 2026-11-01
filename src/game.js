export const SIZE = 8
export let TYPES = 6
export const setTypes = (n) => {
  TYPES = n
}

let nextId = 1
export const newGem = (type, special = null, drop = 0) => ({ id: nextId++, type, special, drop })

const rand = (n) => Math.floor(Math.random() * n)

export function runsOf(board) {
  const runs = []
  const scan = (dir) => {
    for (let a = 0; a < SIZE; a++) {
      let start = 0
      for (let b = 1; b <= SIZE; b++) {
        const get = (i) => (dir === 'h' ? board[a][i] : board[i][a])
        const prev = get(b - 1)
        const cur = b < SIZE ? get(b) : null
        if (cur && prev && cur.type === prev.type) continue
        if (prev && b - start >= 3) {
          const cells = []
          for (let i = start; i < b; i++) cells.push(dir === 'h' ? [a, i] : [i, a])
          runs.push({ cells, type: prev.type })
        }
        start = b
      }
    }
  }
  scan('h')
  scan('v')
  return runs
}

export function squaresOf(board) {
  const out = []
  for (let r = 0; r < SIZE - 1; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      const g = board[r][c]
      if (g && [board[r][c + 1], board[r + 1][c], board[r + 1][c + 1]].every((o) => o && o.type === g.type)) {
        out.push({ cells: [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]], type: g.type })
      }
    }
  }
  return out
}

export function makeBoard() {
  for (;;) {
    const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let type
        do {
          type = rand(TYPES)
        } while (
          (c >= 2 && board[r][c - 1].type === type && board[r][c - 2].type === type) ||
          (r >= 2 && board[r - 1][c].type === type && board[r - 2][c].type === type) ||
          (r >= 1 && c >= 1 && board[r - 1][c - 1].type === type && board[r - 1][c].type === type && board[r][c - 1].type === type)
        )
        board[r][c] = newGem(type)
      }
    }
    if (findMove(board)) return board
  }
}

export function swapCells(board, [r1, c1], [r2, c2]) {
  const next = board.map((row) => row.slice())
  ;[next[r1][c1], next[r2][c2]] = [next[r2][c2], next[r1][c1]]
  return next
}

const key = (r, c) => `${r},${c}`
const inside = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE
const RANK = { rainbow: 3, blast: 2, star: 2, row: 1, col: 1 }

// Expand a set of cleared cells through chain reactions of special gems; returns the specials that fired.
function expand(board, clear, resolved = new Set()) {
  const fired = []
  const seen = new Set()
  const queue = [...clear]
  while (queue.length) {
    const k = queue.pop()
    const [r, c] = k.split(',').map(Number)
    const gem = board[r][c]
    if (!gem?.special || seen.has(k) || resolved.has(k)) continue
    seen.add(k)
    fired.push({ r, c, special: gem.special, type: gem.type })
    const add = []
    if (gem.special === 'blast') {
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) if (Math.abs(dr) + Math.abs(dc) <= 3) add.push([r + dr, c + dc])
    } else if (gem.special === 'row' || gem.special === 'star') {
      for (let j = 0; j < SIZE; j++) add.push([r, j])
    }
    if (gem.special === 'col' || gem.special === 'star') {
      for (let i = 0; i < SIZE; i++) add.push([i, c])
    }
    if (gem.special === 'rainbow') {
      const counts = {}
      board.flat().forEach((g) => g && !g.special && (counts[g.type] = (counts[g.type] || 0) + 1))
      const top = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0]
      for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE; j++) if (board[i][j]?.type === Number(top)) add.push([i, j])
    }
    for (const [i, j] of add) {
      if (!inside(i, j) || !board[i][j]) continue
      const kk = key(i, j)
      if (!clear.has(kk)) {
        clear.add(kk)
        queue.push(kk)
      }
    }
  }
  return fired
}

const gemsOf = (board, clear) =>
  [...clear].map((k) => {
    const [r, c] = k.split(',').map(Number)
    return { r, c, type: board[r][c].type, special: board[r][c].special }
  })

/**
 * Work out what the next cascade step clears. `swap` is [a, b] for the player's move
 * (so rainbow gems and special-gem creation can respond to it), or null for cascades.
 * 4 in a line makes a Line gem, an L/T makes a Bomb, 5 in a line a Rainbow, a 2x2 square a Star.
 */
export function findStep(board, swap = null) {
  const clear = new Set()
  const resolved = new Set()
  const creations = []
  const addCreation = (pos, type, special) => {
    const existing = creations.find((c) => c.pos[0] === pos[0] && c.pos[1] === pos[1])
    if (!existing) creations.push({ pos, type, special })
    else if (RANK[special] > RANK[existing.special]) existing.special = special
  }
  const pick = (cells) =>
    (swap && cells.find(([r, c]) => swap.some(([sr, sc]) => sr === r && sc === c))) || cells[Math.floor(cells.length / 2)]

  if (swap) {
    const [a, b] = swap
    const ga = board[a[0]][a[1]]
    const gb = board[b[0]][b[1]]
    if (ga.special === 'rainbow' || gb.special === 'rainbow') {
      clear.add(key(...a))
      clear.add(key(...b))
      if (ga.special === 'rainbow') resolved.add(key(...a))
      if (gb.special === 'rainbow') resolved.add(key(...b))
      if (ga.special === 'rainbow' && gb.special === 'rainbow') {
        board.forEach((row, r) => row.forEach((_, c) => clear.add(key(r, c))))
      } else {
        const target = (ga.special === 'rainbow' ? gb : ga).type
        board.forEach((row, r) => row.forEach((g, c) => g.type === target && clear.add(key(r, c))))
      }
    } else {
      if (ga.special) clear.add(key(...a))
      if (gb.special) clear.add(key(...b))
    }
  }

  const runs = runsOf(board).map((run) => ({ ...run, dir: run.cells[0][0] === run.cells[1][0] ? 'h' : 'v' }))
  for (const run of runs) {
    run.cells.forEach(([r, c]) => clear.add(key(r, c)))
    if (run.cells.length >= 5) addCreation(pick(run.cells), run.type, 'rainbow')
    else if (run.cells.length === 4) addCreation(pick(run.cells), run.type, run.dir === 'h' ? 'col' : 'row')
  }
  for (const h of runs.filter((x) => x.dir === 'h')) {
    for (const v of runs.filter((x) => x.dir === 'v' && x.type === h.type)) {
      const shared = h.cells.find((c) => v.cells.some((d) => d[0] === c[0] && d[1] === c[1]))
      if (shared) addCreation(shared, h.type, 'blast')
    }
  }
  for (const sq of squaresOf(board)) {
    sq.cells.forEach(([r, c]) => clear.add(key(r, c)))
    addCreation(pick(sq.cells), sq.type, 'star')
  }

  if (!clear.size) return null
  const fired = expand(board, clear, resolved)
  // Gems being born replace their cell instead of being cleared.
  creations.forEach(({ pos }) => clear.delete(key(...pos)))
  return { clear, creations, fired, gems: gemsOf(board, clear) }
}

// A player-triggered clear (power-ups): chain reactions still apply.
export function manualStep(board, keys) {
  const clear = new Set(keys)
  const fired = expand(board, clear)
  return { clear, creations: [], fired, gems: gemsOf(board, clear) }
}

export const cellsOfType = (board, type) => {
  const out = []
  board.forEach((row, r) => row.forEach((g, c) => g.type === type && out.push(key(r, c))))
  return out
}

export function scoreFor(count, combo) {
  return count * 10 * combo + (count > 3 ? (count - 3) * 15 * combo : 0)
}

export function applyStep(board, { clear, creations }) {
  const next = board.map((row) => row.slice())
  creations.forEach(({ pos: [r, c], type, special }) => {
    next[r][c] = newGem(type, special)
  })
  clear.forEach((k) => {
    const [r, c] = k.split(',').map(Number)
    next[r][c] = null
  })
  for (let c = 0; c < SIZE; c++) {
    const col = []
    for (let r = SIZE - 1; r >= 0; r--) if (next[r][c]) col.push(next[r][c])
    const missing = SIZE - col.length
    for (let i = 0; i < missing; i++) col.push(newGem(rand(TYPES), null, missing))
    for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) next[r][c] = col[i]
  }
  return next
}

export function isValidSwap(board, a, b) {
  const swapped = swapCells(board, a, b)
  return !!findStep(swapped, [a, b])
}

const neighbors = (r, c) => [[r, c + 1], [r + 1, c]].filter(([i, j]) => inside(i, j))

export function findMove(board) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      for (const n of neighbors(r, c)) if (isValidSwap(board, [r, c], n)) return [[r, c], n]
  return null
}

export function shuffleBoard(board) {
  const gems = board.flat()
  for (;;) {
    for (let i = gems.length - 1; i > 0; i--) {
      const j = rand(i + 1)
      ;[gems[i], gems[j]] = [gems[j], gems[i]]
    }
    const next = Array.from({ length: SIZE }, (_, r) => gems.slice(r * SIZE, r * SIZE + SIZE))
    if (!findStep(next) && findMove(next)) return next
  }
}

export const levelTarget = (level) => 800 + (level - 1) * 700
export const levelMoves = (level) => Math.min(30, 18 + level)
