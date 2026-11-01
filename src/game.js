export const SIZE = 8
export const TYPES = 6

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
          (r >= 2 && board[r - 1][c].type === type && board[r - 2][c].type === type)
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

// Expand a set of cleared cells through chain reactions of special gems.
function expand(board, clear) {
  const queue = [...clear]
  while (queue.length) {
    const [r, c] = queue.pop().split(',').map(Number)
    const gem = board[r][c]
    if (!gem?.special) continue
    const add = []
    if (gem.special === 'blast') {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add.push([r + dr, c + dc])
    } else if (gem.special === 'rainbow') {
      const counts = {}
      board.flat().forEach((g) => g && !g.special && (counts[g.type] = (counts[g.type] || 0) + 1))
      const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
      for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE; j++) if (board[i][j]?.type === Number(top)) add.push([i, j])
    }
    for (const [i, j] of add) {
      if (!inside(i, j) || !board[i][j]) continue
      const k = key(i, j)
      if (!clear.has(k)) {
        clear.add(k)
        queue.push(k)
      }
    }
  }
  return clear
}

/**
 * Work out what the next cascade step clears. `swap` is [a, b] for the player's move
 * (so rainbow gems and special-gem creation can respond to it), or null for cascades.
 */
export function findStep(board, swap = null) {
  const clear = new Set()
  const creations = []

  if (swap) {
    const [a, b] = swap
    const ga = board[a[0]][a[1]]
    const gb = board[b[0]][b[1]]
    if (ga.special === 'rainbow' || gb.special === 'rainbow') {
      clear.add(key(...a))
      clear.add(key(...b))
      if (ga.special === 'rainbow' && gb.special === 'rainbow') {
        board.forEach((row, r) => row.forEach((_, c) => clear.add(key(r, c))))
      } else {
        const target = (ga.special === 'rainbow' ? gb : ga).type
        board.forEach((row, r) => row.forEach((g, c) => g.type === target && clear.add(key(r, c))))
      }
    }
  }

  for (const run of runsOf(board)) {
    run.cells.forEach(([r, c]) => clear.add(key(r, c)))
    if (run.cells.length >= 4) {
      const pivot =
        (swap && run.cells.find(([r, c]) => swap.some(([sr, sc]) => sr === r && sc === c))) ||
        run.cells[Math.floor(run.cells.length / 2)]
      creations.push({ pos: pivot, type: run.type, special: run.cells.length >= 5 ? 'rainbow' : 'blast' })
    }
  }

  if (!clear.size) return null
  expand(board, clear)
  // Gems being born replace their cell instead of being cleared.
  creations.forEach(({ pos }) => clear.delete(key(...pos)))
  return { clear, creations }
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
    if (!runsOf(next).length && findMove(next)) return next
  }
}

export const levelTarget = (level) => 800 + (level - 1) * 700
export const levelMoves = (level) => Math.min(30, 18 + level)
