import assert from 'node:assert/strict'
import { test } from 'node:test'

import { applyMove, COLS, type Game, newGame, requestRematch, ROWS } from './game.ts'

function startedGame(): Game {
  const game = newGame('test000000', { id: 'a', name: 'Ada' })
  game.players.p2 = { id: 'b', name: 'Bo' }
  game.status = 'playing'
  return game
}

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
  assert.throws(() => applyMove(game, 'p1', 9), /column/)
  assert.throws(() => applyMove(game, 'p1', '3'), /column/)
  play(game, Array(ROWS).fill(0))
  assert.throws(() => applyMove(game, 'p1', 0), /full/)
})

test('rematch resets once both players ask and swaps who starts', () => {
  const game = startedGame()
  play(game, [0, 0, 1, 1, 2, 2, 3, 3, 4])
  requestRematch(game, 'p1')
  assert.equal(game.status, 'won')
  requestRematch(game, 'p2')
  assert.equal(game.status, 'playing')
  assert.equal(game.turn, 'p2')
  assert.ok(game.board.every(cell => cell === null))
  assert.equal(game.score.p1, 1)
})
