'use client'

import { Disc } from '@/components/disc'
import type { PowerKind, PublicGame, Seat } from '@/lib/game'

export type PowerMode = 'drop' | 'hammer'

export const POWER_INFO: Record<PowerKind, { name: string; description: string; aim?: string }> = {
  hammer: {
    name: 'Hammer',
    description: 'Smash any disc. Everything above it falls one space.',
    aim: 'Pick a disc to smash. Press Esc to cancel.'
  },
  flip: {
    name: 'Gravity Flip',
    description: 'Turn the board upside down. Every column falls back in reverse order.'
  },
  four: {
    name: 'Four in a Row',
    description: 'Four in a row wins from now until the round ends. You still drop a disc this turn.'
  }
}

export function PowerIcon({ kind, className = '' }: { kind: PowerKind; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  }
  if (kind === 'hammer') {
    return (
      <svg {...common}>
        <path d="M13.5 3.5 20.5 10.5 17.5 13.5 10.5 6.5Z" fill="currentColor" />
        <path d="M12 10 4 18a1.4 1.4 0 0 0 0 2 1.4 1.4 0 0 0 2 0l8-8" />
      </svg>
    )
  }
  if (kind === 'four') {
    return (
      <svg {...common}>
        <path d="M15 20V4L5 15h14" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M7 4v14M4 7l3-3 3 3M17 20V6M14 17l3 3 3-3" />
    </svg>
  )
}

type CardProps = {
  game: PublicGame
  seat: Seat
  you: Seat | null
  canUse: boolean
  mode: PowerMode
  onUse: () => void
  onCancel: () => void
}

// One player's power-up, visible to everyone. Your own card also has the button to use it:
// The Hammer switches the board into aiming mode; the others fire right away.
export function PowerCard({ game, seat, you, canUse, mode, onUse, onCancel }: CardProps) {
  const power = game.powers[seat]
  const player = game.players[seat]
  if (!power || !player) return null

  const info = POWER_INFO[power]
  const used = !!game.powerUsed[seat]
  const mine = seat === you
  const aiming = mine && mode !== 'drop'
  const finished = game.status === 'won' || game.status === 'draw'

  return (
    <div className={`toy flex flex-col gap-2.5 rounded-2xl bg-surface p-3 transition-opacity ${used ? 'opacity-55' : ''}`}>
      <div className="flex items-center gap-2 text-sm font-bold">
        <Disc seat={seat} className="size-4 border-2" />
        <span className="min-w-0 flex-1 truncate">{mine ? 'Your power-up' : `${player.name}'s power-up`}</span>
        <span
          className={`rounded-full border-2 border-line px-2 py-px text-xs font-extrabold ${used ? 'bg-surface text-muted' : 'bg-win text-on-accent'}`}
        >
          {used ? 'Used' : 'Ready'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl border-3 border-line bg-win text-on-accent ${used ? 'grayscale' : ''}`}
        >
          <PowerIcon kind={power} className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="font-extrabold">{info.name}</p>
          <p className="text-sm leading-snug text-muted">{aiming ? info.aim : info.description}</p>
        </div>
      </div>
      {mine &&
        !used &&
        !finished &&
        (aiming ? (
          <button onClick={onCancel} className="btn btn-plain text-sm">
            Cancel
          </button>
        ) : (
          <button onClick={onUse} disabled={!canUse} className="btn bg-win text-sm text-on-accent">
            {canUse ? `Use ${info.name}` : `Use ${info.name} on Your Turn`}
          </button>
        ))}
    </div>
  )
}
