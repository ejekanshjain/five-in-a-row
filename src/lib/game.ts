// Pure game rules shared by the server (which enforces them) and the browser (which renders them).

export const COLS = 9
export const ROWS = 8
export const WIN_LENGTH = 5

export type Seat = 'p1' | 'p2'
export type Cell = Seat | null
export type Status = 'waiting' | 'playing' | 'won' | 'draw'

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
  lastMove: number | null
  score: Record<Seat | 'draws', number>
  rematch: Seat[]
}

// What browsers receive: the game with player ids stripped.
export type PublicGame = Omit<Game, 'players'> & {
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

export function newGame(id: string, host: Player): Game {
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
    lastMove: null,
    score: { p1: 0, p2: 0, draws: 0 },
    rematch: []
  }
}

export function toPublic(game: Game): PublicGame {
  const strip = (p: Player | null) => (p ? { name: p.name } : null)
  return { ...game, players: { p1: strip(game.players.p1), p2: strip(game.players.p2) } }
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
  if (!seat) return []
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

// Applies a move for `seat` in place. Throws GameError when the move breaks a rule.
export function applyMove(game: Game, seat: Seat, col: unknown) {
  if (game.status !== 'playing') throw new GameError('The game is not in progress.', 409)
  if (game.turn !== seat) throw new GameError('It is not your turn.', 409)
  if (typeof col !== 'number' || !Number.isInteger(col) || col < 0 || col >= COLS) throw new GameError('Pick a column from 1 to 9.')

  const row = landingRow(game.board, col)
  if (row < 0) throw new GameError('That column is full. Pick another one.', 409)

  const index = row * COLS + col
  game.board[index] = seat
  game.lastMove = index
  game.winLine = findWinLine(game.board, index)

  if (game.winLine.length) {
    game.status = 'won'
    game.winner = seat
    game.score[seat]++
  } else if (game.board.every(Boolean)) {
    game.status = 'draw'
    game.score.draws++
  } else {
    game.turn = other(seat)
  }
}

// Records a rematch request. Once both players ask, it resets the board and the other player starts.
export function requestRematch(game: Game, seat: Seat) {
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
  game.lastMove = null
  game.rematch = []
}

// Trims and validates a display name. Throws GameError when it is empty or too long.
export function cleanName(input: unknown): string {
  const name = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new GameError('Enter a name so your opponent knows who you are.')
  if (name.length > 20) throw new GameError('Use a name of 20 characters or fewer.')
  return name
}
