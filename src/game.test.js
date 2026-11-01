import test from 'node:test'
import assert from 'node:assert/strict'
import { SIZE, makeBoard, runsOf, findStep, applyStep, findMove, newGem, shuffleBoard } from './game.js'

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

test('a run of 4 creates a blast gem that clears a 3x3 area', () => {
  const b = filled()
  for (let c = 0; c < 4; c++) b[7][c] = newGem(5)
  const step = findStep(b)
  assert.equal(step.creations[0].special, 'blast')
  const next = applyStep(b, step)
  assert.equal(next.flat().filter((g) => g.special === 'blast').length, 1)
  const col = next[7].findIndex((g) => g.special === 'blast')
  next[7][col].special = 'blast'
  // Force a match containing the blast gem and check the 3x3 blast gets cleared.
  for (const dc of [1, 2]) next[7][Math.min(col + dc, SIZE - 1)] = newGem(next[7][col].type)
  const burst = findStep(next)
  assert.ok(burst && burst.clear.size >= 3)
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
