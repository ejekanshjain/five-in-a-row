'use client'

import { type CSSProperties, useState } from 'react'

import { Confetti } from '@/components/confetti'
import { Disc } from '@/components/disc'
import { PowerIcon, type PowerMode } from '@/components/power-ups'
import { type Cell, COLS, landingRow, type PublicGame, ROWS, type Seat } from '@/lib/game'

type Props = {
  game: PublicGame
  you: Seat | null
  canMove: boolean
  mode: PowerMode
  onColumn: (col: number) => void
  onSmash: (index: number) => void
}

type Motion = { className: string; style: CSSProperties }

const columns: CSSProperties = { gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }

// Starts a piece `slots` holes above where it sits, after `delay` ms.
const fall = (slots: number, delay = 0): Motion => ({
  className: 'drop',
  style: { '--drop-from': `calc(${-slots} * (100% + 6px))`, animationDelay: `${delay}ms` } as CSSProperties
})

// Works out how the piece at `index` should animate after the last action, or null if it stays put.
function motionFor(game: PublicGame, index: number): Motion | null {
  const action = game.lastAction
  if (!action || !game.board[index]) return null
  const row = Math.floor(index / COLS)
  const col = index % COLS

  if (action.kind === 'flip') return fall(row + 1, 420 + col * 30)
  if (action.kind === 'hammer') {
    const hitRow = Math.floor(action.index / COLS)
    return col === action.index % COLS && row <= hitRow ? fall(1, 300) : null
  }
  return index === action.index ? fall(row + 2) : null
}

function Piece({ cell, className = '', style, win }: { cell: Cell; className?: string; style?: CSSProperties; win?: boolean }) {
  if (!cell) return null
  if (cell === 'brick') return <span className={`brick ${className}`} style={style} data-win={win || undefined} />
  return <Disc seat={cell} className={className} style={style} win={win} />
}

// The game board. In drop and brick mode each column is a button; hovering one floats your piece
// above it and marks where it will land. In hammer mode each filled cell is a button instead.
export function Board({ game, you, canMove, mode, onColumn, onSmash }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const winning = new Set(game.winLine)
  const action = game.lastAction
  const preview: Cell = mode === 'brick' ? 'brick' : you
  const flipped = action?.kind === 'flip'

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="grid gap-1 px-[11px] pb-1 sm:gap-1.5 sm:px-[15px]" style={columns} aria-hidden>
        {Array.from({ length: COLS }, (_, col) => (
          <span key={col} className="aspect-square">
            {canMove && mode !== 'hammer' && hover === col && landingRow(game.board, col) >= 0 && (
              <Piece cell={preview} className="bob size-full" />
            )}
          </span>
        ))}
      </div>

      <div
        key={flipped ? `flip-${game.version}` : 'board'}
        className={`board grid gap-1 p-2 sm:gap-1.5 sm:p-3 ${flipped ? 'board-flip' : ''}`}
        style={columns}
        data-won={game.winner ? '' : undefined}
      >
        {Array.from({ length: COLS }, (_, col) => {
          const landing = landingRow(game.board, col)
          const enabled = canMove && mode !== 'hammer' && landing >= 0
          return (
            <div
              key={col}
              className={`relative flex flex-col gap-1 rounded-xl sm:gap-1.5 ${enabled && hover === col ? 'bg-white/10' : ''}`}
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const index = row * COLS + col
                const cell = game.board[index]
                const motion = motionFor(game, index)
                const piece = (
                  <Piece
                    key={motion ? `m${game.version}` : 'still'}
                    cell={cell}
                    win={winning.has(index)}
                    className={`absolute inset-0 ${motion?.className ?? ''}`}
                    style={motion?.style}
                  />
                )
                const smashed = action?.kind === 'hammer' && action.index === index && (
                  <span key={`smash${game.version}`} aria-hidden>
                    <span className="smash-burst" />
                    <PowerIcon kind="hammer" className="hammer-swing" />
                  </span>
                )

                if (canMove && mode === 'hammer' && cell) {
                  return (
                    <button
                      key={row}
                      type="button"
                      onClick={() => onSmash(index)}
                      aria-label={`Smash the ${cell === 'brick' ? 'brick' : 'disc'} in column ${col + 1}, row ${ROWS - row}`}
                      className="hole smashable relative aspect-square w-full"
                    >
                      {piece}
                    </button>
                  )
                }
                return (
                  <span key={row} className="hole relative aspect-square w-full">
                    {piece}
                    {smashed}
                    {!cell && enabled && hover === col && row === landing && (
                      <span
                        className={`absolute inset-[16%] border-[2.5px] border-dashed ${preview === 'brick' ? 'rounded-[24%]' : 'rounded-full'}`}
                        style={{ borderColor: preview === 'brick' ? 'var(--brick-deep)' : `var(--${preview})` }}
                      />
                    )}
                  </span>
                )
              })}

              {mode !== 'hammer' && (
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => onColumn(col)}
                  onMouseEnter={() => setHover(col)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(col)}
                  onBlur={() => setHover(null)}
                  aria-label={`${mode === 'brick' ? 'Drop your brick' : 'Drop a disc'} in column ${col + 1}`}
                  className="absolute inset-0 z-[4] rounded-xl outline-none enabled:cursor-pointer focus-visible:ring-3 focus-visible:ring-win"
                />
              )}
            </div>
          )
        })}
      </div>

      {game.status === 'won' && <Confetti key={game.version} />}
    </div>
  )
}
