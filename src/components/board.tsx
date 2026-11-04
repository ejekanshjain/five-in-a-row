'use client'

import { type CSSProperties, useState } from 'react'

import { Confetti } from '@/components/confetti'
import { Disc } from '@/components/disc'
import { COLS, landingRow, type PublicGame, ROWS, type Seat } from '@/lib/game'

type Props = {
  game: PublicGame
  you: Seat | null
  canMove: boolean
  onDrop: (col: number) => void
}

const columns: CSSProperties = { gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }

// The game board. Each column is a button. Hovering or focusing one floats your disc above it
// and marks the hole where it will land.
export function Board({ game, you, canMove, onDrop }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const winning = new Set(game.winLine)

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="grid gap-1 px-[11px] pb-1 sm:gap-1.5 sm:px-[15px]" style={columns} aria-hidden>
        {Array.from({ length: COLS }, (_, col) => (
          <span key={col} className="aspect-square">
            {you && canMove && hover === col && landingRow(game.board, col) >= 0 && (
              <Disc seat={you} className="bob size-full" />
            )}
          </span>
        ))}
      </div>

      <div className="board grid gap-1 p-2 sm:gap-1.5 sm:p-3" style={columns} data-won={game.winner ? '' : undefined}>
        {Array.from({ length: COLS }, (_, col) => {
          const landing = landingRow(game.board, col)
          const enabled = canMove && landing >= 0
          return (
            <button
              key={col}
              type="button"
              disabled={!enabled}
              onClick={() => onDrop(col)}
              onMouseEnter={() => setHover(col)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(col)}
              onBlur={() => setHover(null)}
              aria-label={`Drop a disc in column ${col + 1}`}
              className="flex flex-col gap-1 rounded-xl outline-none enabled:cursor-pointer enabled:hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-3 focus-visible:ring-win sm:gap-1.5"
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const index = row * COLS + col
                const seat = game.board[index]
                const isLast = index === game.lastMove
                return (
                  <span key={row} className="hole relative aspect-square w-full">
                    {seat ? (
                      <Disc
                        seat={seat}
                        win={winning.has(index)}
                        className={`absolute inset-0 ${isLast ? 'drop' : ''}`}
                        style={isLast ? ({ '--drop-from': `calc(${-(row + 2)} * (100% + 6px))` } as CSSProperties) : undefined}
                      />
                    ) : (
                      you &&
                      enabled &&
                      hover === col &&
                      row === landing && (
                        <span
                          className="absolute inset-[16%] rounded-full border-[2.5px] border-dashed"
                          style={{ borderColor: `var(--${you})` }}
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

      {game.status === 'won' && <Confetti key={game.version} />}
    </div>
  )
}
