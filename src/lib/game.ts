// Pure game rules shared by the server (which enforces them) and the browser (which renders them).

export const COLS = 10
export const ROWS = 8
export const WIN_LENGTH = 5

export type Seat = 'p1' | 'p2'
// A brick is a neutral stone from the Brick power-up. It belongs to nobody and blocks lines.
export type Cell = Seat | 'brick' | null
export type Status = 'waiting' | 'playing' | 'won' | 'draw'

export type PowerKind = 'hammer' | 'brick' | 'flip'
export const POWER_KINDS: PowerKind[] = ['hammer', 'brick', 'flip']

// The last thing that happened on the board, so browsers know what to animate and announce.
// `index` is the cell a disc or brick landed in, or the cell the hammer smashed.
export type LastAction =
  | { kind: 'drop' | 'brick' | 'hammer'; seat: Seat; index: number }
  | { kind: 'flip'; seat: Seat }

export type Player = { id: string; name: string }

// Full game record as stored on the server. Player ids are secret and never leave the server.
export type Game = {
  id: string
  version: number
  board: Cell[]
  players: Record<Seat, Player | null>
  status: Status
  turn: Seat
  starter: Seat
  winner: Seat | null
  winLine: number[]
  lastAction: LastAction | null
  score: Record<Seat | 'draws', number>
  rematch: Seat[]
  // Counts rounds, so browsers know when a rematch dealt them a new power-up.
  round: number
  // Each player's secret power-up for this round. Only its owner ever sees it.
  powers: Record<Seat, PowerKind | null>
  // Which power-up each player used this round. Public, since using one reveals it.
  powerUsed: Record<Seat, PowerKind | null>
}

// What browsers receive: the game with player ids and secret power-ups stripped.
export type PublicGame = Omit<Game, 'players' | 'powers'> & {
  players: Record<Seat, { name: string } | null>
}

// A rule violation the player can fix. `status` is the HTTP status the API responds with.
export class GameError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export const other = (seat: Seat): Seat => (seat === 'p1' ? 'p2' : 'p1')

export const emptyBoard = (): Cell[] => Array(ROWS * COLS).fill(null)

// Creates a game with `host` in the first seat and deals them a power-up.
export function newGame(id: string, host: Player, power: PowerKind): Game {
  return {
    id,
    version: 0,
    board: emptyBoard(),
    players: { p1: host, p2: null },
    status: 'waiting',
    turn: 'p1',
    starter: 'p1',
    winner: null,
    winLine: [],
    lastAction: null,
    score: { p1: 0, p2: 0, draws: 0 },
    rematch: [],
    round: 1,
    powers: { p1: power, p2: null },
    powerUsed: { p1: null, p2: null }
  }
}

export function toPublic(game: Game): PublicGame {
  const { players, powers, ...rest } = game
  void powers
  const strip = (p: Player | null) => (p ? { name: p.name } : null)
  return { ...rest, players: { p1: strip(players.p1), p2: strip(players.p2) } }
}

export function seatOf(game: Game, playerId: string | null): Seat | null {
  if (!playerId) return null
  if (game.players.p1?.id === playerId) return 'p1'
  if (game.players.p2?.id === playerId) return 'p2'
  return null
}

// Row index (0 = top) where a disc dropped in `col` comes to rest, or -1 if the column is full.
export function landingRow(board: Cell[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row * COLS + col]) return row
  }
  return -1
}

// Returns every cell in a run of WIN_LENGTH or more through `index`, or an empty array.
export function findWinLine(board: Cell[], index: number): number[] {
  const seat = board[index]
  if (!seat || seat === 'brick') return []
  const row = Math.floor(index / COLS)
  const col = index % COLS
  const line: number[] = []

  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ]) {
    const run = [index]
    for (const sign of [1, -1]) {
      let r = row + dr * sign
      let c = col + dc * sign
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === seat) {
        run.push(r * COLS + c)
        r += dr * sign
        c += dc * sign
      }
    }
    if (run.length >= WIN_LENGTH) line.push(...run)
  }
  return [...new Set(line)]
}

// Every cell that is part of a line of five for `seat`, anywhere on the board.
function linesFor(board: Cell[], seat: Seat): number[] {
  const cells = new Set<number>()
  board.forEach((cell, index) => {
    if (cell === seat) findWinLine(board, index).forEach(i => cells.add(i))
  })
  return [...cells]
}

function checkTurn(game: Game, seat: Seat) {
  if (game.status !== 'playing') throw new GameError('The game is not in progress.', 409)
  if (game.turn !== seat) throw new GameError('It is not your turn.', 409)
}

function checkColumn(col: unknown): asserts col is number {
  if (typeof col !== 'number' || !Number.isInteger(col) || col < 0 || col >= COLS) {
    throw new GameError('Pick a column from 1 to 10.')
  }
}

// Ends the turn for `seat`: decides a win or draw, or passes the turn. Power-ups can rearrange
// the board, so it checks both players. If both have five, the player who acted wins.
function finishTurn(game: Game, seat: Seat) {
  const mine = linesFor(game.board, seat)
  const theirs = linesFor(game.board, other(seat))
  const winner = mine.length ? seat : theirs.length ? other(seat) : null

  if (winner) {
    game.status = 'won'
    game.winner = winner
    game.winLine = winner === seat ? mine : theirs
    game.score[winner]++
  } else if (game.board.every(Boolean)) {
    game.status = 'draw'
    game.score.draws++
  } else {
    game.turn = other(seat)
  }
}

// Applies a move for `seat` in place. Throws GameError when the move breaks a rule.
export function applyMove(game: Game, seat: Seat, col: unknown) {
  checkTurn(game, seat)
  checkColumn(col)

  const row = landingRow(game.board, col)
  if (row < 0) throw new GameError('That column is full. Pick another one.', 409)

  const index = row * COLS + col
  game.board[index] = seat
  game.lastAction = { kind: 'drop', seat, index }
  finishTurn(game, seat)
}

// Uses `seat`'s secret power-up in place of a move. `target` is a cell index for the hammer,
// a column for the brick, and ignored for the flip. Throws GameError when it can't be used.
export function usePower(game: Game, seat: Seat, target: unknown) {
  checkTurn(game, seat)
  const power = game.powers[seat]
  if (!power) throw new GameError('You have no power-up this round.', 409)
  if (game.powerUsed[seat]) throw new GameError('You already used your power-up this round.', 409)

  if (power === 'hammer') {
    if (typeof target !== 'number' || !Number.isInteger(target) || !game.board[target]) {
      throw new GameError('Pick a disc or brick to smash.')
    }
    // Everything above the smashed cell falls one space.
    const col = target % COLS
    for (let row = Math.floor(target / COLS); row > 0; row--) {
      game.board[row * COLS + col] = game.board[(row - 1) * COLS + col]
    }
    game.board[col] = null
    game.lastAction = { kind: 'hammer', seat, index: target }
  } else if (power === 'brick') {
    checkColumn(target)
    const row = landingRow(game.board, target)
    if (row < 0) throw new GameError('That column is full. Pick another one.', 409)
    game.board[row * COLS + target] = 'brick'
    game.lastAction = { kind: 'brick', seat, index: row * COLS + target }
  } else {
    if (!game.board.some(Boolean)) throw new GameError('Gravity Flip needs discs on the board.', 409)
    // Turning the board over and letting it fall reverses each column's stack.
    for (let col = 0; col < COLS; col++) {
      const stack: Cell[] = []
      for (let row = ROWS - 1; row >= 0; row--) {
        const cell = game.board[row * COLS + col]
        if (cell) stack.push(cell)
      }
      stack.reverse()
      for (let row = ROWS - 1, i = 0; row >= 0; row--, i++) game.board[row * COLS + col] = stack[i] ?? null
    }
    game.lastAction = { kind: 'flip', seat }
  }

  game.powerUsed[seat] = power
  finishTurn(game, seat)
}

// Records a rematch request. Once both players ask, it resets the board, deals fresh power-ups
// with `deal`, and the other player starts.
export function requestRematch(game: Game, seat: Seat, deal: () => PowerKind) {
  if (game.status !== 'won' && game.status !== 'draw') {
    throw new GameError('You can ask for a rematch once the game ends.', 409)
  }
  if (!game.rematch.includes(seat)) game.rematch.push(seat)
  if (game.rematch.length < 2) return

  game.starter = other(game.starter)
  game.turn = game.starter
  game.board = emptyBoard()
  game.status = 'playing'
  game.winner = null
  game.winLine = []
  game.lastAction = null
  game.rematch = []
  game.round++
  game.powers = { p1: deal(), p2: deal() }
  game.powerUsed = { p1: null, p2: null }
}

// Trims and validates a display name. Throws GameError when it is empty or too long.
export function cleanName(input: unknown): string {
  const name = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new GameError('Enter a name so your opponent knows who you are.')
  if (name.length > 20) throw new GameError('Use a name of 20 characters or fewer.')
  return name
}
