import type { CSSProperties } from 'react'

import { CreateGameForm } from '@/components/create-game-form'
import { Disc } from '@/components/disc'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Seat } from '@/lib/game'

const STEPS = [
  'Enter your name and create a game.',
  'Send the game link to a colleague.',
  'Take turns dropping discs. The first to line up five wins.'
]

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-5">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        <HeroBoard />
        <div className="space-y-3">
          <h1 className="text-6xl leading-[0.9] font-extrabold tracking-[-0.04em] sm:text-7xl">5 in a Row</h1>
          <p className="text-lg text-muted">Drop discs, line up five, and settle it before the coffee gets cold.</p>
        </div>
        <CreateGameForm />
        <ol className="space-y-2.5">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 font-semibold">
              <span className="relative grid size-8 shrink-0 place-items-center">
                <Disc seat={i % 2 ? 'p2' : 'p1'} className="absolute inset-0" />
                <span className="relative text-sm font-extrabold text-on-accent">{i + 1}</span>
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}

// A 5 by 5 mini board where pink discs drop in one by one to complete a diagonal, then glow.
function HeroBoard() {
  const size = 5
  const cells = Array.from({ length: size * size }, (_, i) => {
    const row = Math.floor(i / size)
    const diagonalRow = size - 1 - (i % size)
    const seat: Seat | null = row === diagonalRow ? 'p1' : row > diagonalRow ? 'p2' : null
    return { row, seat, step: row === diagonalRow ? i % size : undefined }
  })

  return (
    <div className="board grid w-52 grid-cols-5 gap-1.5 p-2.5" aria-hidden>
      {cells.map(({ row, seat, step }, i) => (
        <span key={i} className="hole relative aspect-square">
          {seat && (
            <Disc
              seat={seat}
              win={step !== undefined}
              className={`absolute inset-0 ${step !== undefined ? 'hero-drop' : ''}`}
              style={
                step !== undefined
                  ? ({ '--i': step, '--drop-from': `calc(${-(row + 2)} * (100% + 6px))` } as CSSProperties)
                  : undefined
              }
            />
          )}
        </span>
      ))}
    </div>
  )
}
