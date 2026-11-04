import assert from 'node:assert/strict'
import { test } from 'node:test'

import { applyMove, COLS, type Game, newGame, type PowerKind, requestRematch, ROWS, usePower } from './game.ts'

function startedGame(p1Power: PowerKind = 'hammer', p2Power: PowerKind = 'hammer'): Game {
  const game = newGame('test000000', { id: 'a', name: 'Ada' }, p1Power)
  game.players.p2 = { id: 'b', name: 'Bo' }
  game.powers.p2 = p2Power
  game.status = 'playing'
  return game
}

const at = (row: number, col: number) => row * COLS + col
const BOTTOM = ROWS - 1

// Plays alternating moves, p1 first.
function play(game: Game, cols: number[]) {
  cols.forEach((col, i) => applyMove(game, i % 2 ? 'p2' : 'p1', col))
}

test('discs stack from the bottom of a column', () => {
  const game = startedGame()
  play(game, [4, 4])
  assert.equal(game.board[(ROWS - 1) * COLS + 4], 'p1')
  assert.equal(game.board[(ROWS - 2) * COLS + 4], 'p2')
})

test('five across wins, four does not', () => {
  const game = startedGame()
  play(game, [0, 0, 1, 1, 2, 2, 3, 3])
  assert.equal(game.status, 'playing')
  play(game, [4])
  assert.equal(game.status, 'won')
  assert.equal(game.winner, 'p1')
  assert.equal(game.winLine.length, 5)
  assert.equal(game.score.p1, 1)
})

test('five on a diagonal wins', () => {
  const game = startedGame()
  // Build a rising diagonal for p1 in columns 0 to 4, with p2 filling underneath.
  play(game, [0, 1, 1, 2, 2, 3, 2, 3, 3, 4, 3, 4, 4, 7, 4, 8, 4])
  assert.equal(game.winner, 'p1')
})

test('rejects moves out of turn, into full columns, and with bad input', () => {
  const game = startedGame()
  assert.throws(() => applyMove(game, 'p2', 0), /not your turn/)
  assert.throws(() => applyMove(game, 'p1', COLS), /column/)
  assert.throws(() => applyMove(game, 'p1', '3'), /column/)
  play(game, Array(ROWS).fill(0))
  assert.throws(() => applyMove(game, 'p1', 0), /full/)
})

test('rematch resets once both players ask, swaps who starts, and deals new power-ups', () => {
  const game = startedGame()
  play(game, [0, 0, 1, 1, 2, 2, 3, 3, 4])
  requestRematch(game, 'p1', () => 'brick')
  assert.equal(game.status, 'won')
  requestRematch(game, 'p2', () => 'brick')
  assert.equal(game.status, 'playing')
  assert.equal(game.turn, 'p2')
  assert.equal(game.round, 2)
  assert.ok(game.board.every(cell => cell === null))
  assert.equal(game.score.p1, 1)
  assert.deepEqual(game.powers, { p1: 'brick', p2: 'brick' })
})

test('hammer smashes a disc, drops the column, and uses up the turn', () => {
  const game = startedGame()
  play(game, [4, 4, 4]) // column 4 from the bottom: p1, p2, p1
  usePower(game, 'p2', at(BOTTOM, 4))
  assert.equal(game.board[at(BOTTOM, 4)], 'p2')
  assert.equal(game.board[at(BOTTOM - 1, 4)], 'p1')
  assert.equal(game.board[at(BOTTOM - 2, 4)], null)
  assert.equal(game.turn, 'p1')
  assert.equal(game.powerUsed.p2, 'hammer')
})

test('a power-up works once per round and only on your turn', () => {
  const game = startedGame()
  applyMove(game, 'p1', 4)
  assert.throws(() => usePower(game, 'p1', at(BOTTOM, 4)), /not your turn/)
  usePower(game, 'p2', at(BOTTOM, 4))
  applyMove(game, 'p1', 5)
  assert.throws(() => usePower(game, 'p2', at(BOTTOM, 5)), /already used/)
  applyMove(game, 'p2', 6)
  assert.throws(() => usePower(game, 'p1', at(0, 0)), /disc or brick/)
})

// Fills columns from the bottom up. `stacks[col]` lists that column's cells, bottom first.
function stackUp(game: Game, stacks: Record<number, ('p1' | 'p2')[]>) {
  for (const [col, cells] of Object.entries(stacks)) {
    cells.forEach((cell, i) => (game.board[at(BOTTOM - i, Number(col))] = cell))
  }
}

test('a hammer that completes the opponent line makes them win', () => {
  const game = startedGame()
  // p1 has four across the bottom. p2 smashes its own disc under a p1 disc in column 4.
  stackUp(game, { 0: ['p1'], 1: ['p1'], 2: ['p1'], 3: ['p1'], 4: ['p2', 'p1'] })
  game.turn = 'p2'
  usePower(game, 'p2', at(BOTTOM, 4))
  assert.equal(game.winner, 'p1')
  assert.equal(game.score.p1, 1)
})

test('brick drops like a disc and blocks lines', () => {
  const game = startedGame('brick')
  stackUp(game, { 0: ['p1'], 1: ['p1'], 2: ['p1'], 3: ['p1'] })
  usePower(game, 'p1', 4)
  assert.equal(game.board[at(BOTTOM, 4)], 'brick')
  assert.equal(game.status, 'playing')
  game.turn = 'p1'
  applyMove(game, 'p1', 5)
  assert.equal(game.status, 'playing')
})

test('gravity flip reverses every column, and the user wins when both get five', () => {
  const game = startedGame('flip')
  // After flipping, the bottom row is all p1 and the row above is all p2.
  stackUp(game, {
    0: ['p2', 'p1'],
    1: ['p1', 'p2', 'p1'],
    2: ['p2', 'p1'],
    3: ['p1', 'p2', 'p1'],
    4: ['p2', 'p1']
  })
  usePower(game, 'p1', undefined)
  assert.equal(game.board[at(BOTTOM, 0)], 'p1')
  assert.equal(game.board[at(BOTTOM - 1, 0)], 'p2')
  assert.equal(game.board[at(BOTTOM - 2, 0)], null)
  assert.equal(game.winner, 'p1')
  assert.equal(game.powerUsed.p1, 'flip')
})
