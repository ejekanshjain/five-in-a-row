'use client'

import { Disc } from '@/components/disc'
import { COLS, landingRow, type PublicGame, ROWS, type Seat } from '@/lib/game'

type Props = {
  game: PublicGame
  you: Seat | null
  canMove: boolean
  onDrop: (col: number) => void
}

// The 9 by 8 grid. Each column is a button; hovering it previews where your disc will land.
export function Board({ game, you, canMove, onDrop }: Props) {
  const winning = new Set(game.winLine)

  return (
    <div className="mx-auto grid w-full max-w-[560px] grid-cols-9 gap-1 rounded-2xl bg-board p-2 shadow-2xl shadow-black/40 sm:gap-1.5 sm:p-3">
      {Array.from({ length: COLS }, (_, col) => {
        const landing = landingRow(game.board, col)
        const enabled = canMove && landing >= 0
        return (
          <button
            key={col}
            type="button"
            disabled={!enabled}
            onClick={() => onDrop(col)}
            aria-label={`Drop a disc in column ${col + 1}`}
            className="group flex flex-col gap-1 rounded-lg outline-none enabled:cursor-pointer enabled:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60 sm:gap-1.5"
          >
            {Array.from({ length: ROWS }, (_, row) => {
              const index = row * COLS + col
              const seat = game.board[index]
              const isLast = index === game.lastMove
              return (
                <span key={row} className="relative aspect-square w-full rounded-full bg-bg">
                  {seat ? (
                    <Disc
                      seat={seat}
                      className={`absolute inset-0 ${isLast ? 'animate-drop' : ''} ${winning.has(index) ? 'animate-win' : ''}`}
                      style={isLast ? { ['--drop-from' as string]: `${-(row + 1) * 115}%` } : undefined}
                    />
                  ) : (
                    enabled &&
                    you &&
                    row === landing && (
                      <Disc
                        seat={you}
                        className="absolute inset-0 opacity-0 group-hover:opacity-35 group-focus-visible:opacity-35"
                      />
                    )
                  )}
                </span>
              )
            })}
          </button>
        )
      })}
    </div>
  )
}
