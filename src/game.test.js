import test from 'node:test'
import assert from 'node:assert/strict'
import { SIZE, makeBoard, runsOf, findStep, applyStep, findMove, newGem, shuffleBoard, manualStep } from './game.js'

const filled = () => {
  // Checker-ish pattern with no runs of 3.
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => newGem((r * 2 + c) % 6)),
  )
}

test('new boards have no matches and at least one move', () => {
  for (let i = 0; i < 20; i++) {
    const b = makeBoard()
    assert.equal(runsOf(b).length, 0)
    assert.equal(findStep(b), null)
    assert.ok(findMove(b))
  }
})

test('detects a run of 3 and refills the board after clearing', () => {
  const b = filled()
  for (let c = 0; c < 3; c++) b[7][c] = newGem(5)
  b[7][3] = newGem(0)
  const step = findStep(b)
  assert.ok(step.clear.has('7,0') && step.clear.has('7,2'))
  const next = applyStep(b, step)
  assert.ok(next.flat().every(Boolean))
})

test('a horizontal run of 4 makes a column Line gem that clears its column', () => {
  const b = filled()
  for (let c = 0; c < 4; c++) b[7][c] = newGem(5)
  const step = findStep(b)
  assert.equal(step.creations[0].special, 'col')
  const next = applyStep(b, step)
  const col = next[7].findIndex((g) => g.special === 'col')
  assert.ok(col >= 0)
  const fire = manualStep(next, [`7,${col}`])
  assert.equal(fire.clear.size, SIZE)
})

test('a 2x2 square makes a Star gem that clears row and column', () => {
  const b = filled()
  for (const [r, c] of [[3, 3], [3, 4], [4, 3], [4, 4]]) b[r][c] = newGem(5)
  const step = findStep(b)
  assert.equal(step.creations[0].special, 'star')
  const next = applyStep(b, step)
  const star = next.flat().find((g) => g.special === 'star')
  const at = next.flatMap((row, r) => row.map((g, c) => (g === star ? `${r},${c}` : null))).find(Boolean)
  assert.equal(manualStep(next, [at]).clear.size, SIZE * 2 - 1)
})

test('an L shape makes a Bomb gem', () => {
  const b = filled()
  for (const [r, c] of [[2, 2], [2, 3], [2, 4], [3, 2], [4, 2]]) b[r][c] = newGem(5)
  assert.ok(findStep(b).creations.some((c) => c.special === 'blast'))
})

test('rainbow swap clears every gem of the swapped colour', () => {
  const b = filled()
  b[0][0] = newGem(0, 'rainbow')
  const target = b[0][1].type
  const step = findStep(b, [[0, 0], [0, 1]])
  const count = b.flat().filter((g) => g.type === target).length
  assert.ok(step.clear.size >= count)
})

test('shuffle keeps gems and leaves a playable board', () => {
  const b = makeBoard()
  const s = shuffleBoard(b)
  assert.equal(s.flat().length, SIZE * SIZE)
  assert.ok(findMove(s))
})
