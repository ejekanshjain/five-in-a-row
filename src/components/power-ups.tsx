'use client'

import type { PowerKind, PublicGame, Seat } from '@/lib/game'

export type PowerMode = 'drop' | 'hammer' | 'brick'

export const POWER_INFO: Record<PowerKind, { name: string; description: string; aim?: string }> = {
  hammer: {
    name: 'Hammer',
    description: 'Smash any disc or brick. Everything above it falls one space.',
    aim: 'Pick a disc or brick to smash. Press Esc to cancel.'
  },
  brick: {
    name: 'Brick',
    description: 'Drop a stone that belongs to nobody. It blocks lines for the rest of the round.',
    aim: 'Pick a column for your brick. Press Esc to cancel.'
  },
  flip: {
    name: 'Gravity Flip',
    description: 'Turn the board upside down. Every column falls back in reverse order.'
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
  if (kind === 'brick') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 12h18M10 6v6M14 12v6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M7 4v14M4 7l3-3 3 3M17 20V6M14 17l3 3 3-3" />
    </svg>
  )
}

// The small round badge on a player card. Players see their own power-up; everyone else
// sees a "?" until it's used.
export function PowerBadge({ game, seat, you, power }: { game: PublicGame; seat: Seat; you: Seat | null; power: PowerKind | null }) {
  const used = game.powerUsed[seat]
  const known = used ?? (seat === you ? power : null)
  const label = used
    ? `Used ${POWER_INFO[used].name}`
    : known
      ? `Your secret power-up: ${POWER_INFO[known].name}`
      : 'Secret power-up, not used yet'

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full border-[2.5px] border-line bg-win text-on-accent ${used ? 'opacity-45 grayscale' : ''}`}
    >
      {known ? <PowerIcon kind={known} className="size-3.5" /> : <span className="text-xs leading-none font-extrabold">?</span>}
    </span>
  )
}

type PanelProps = {
  power: PowerKind
  used: boolean
  canUse: boolean
  mode: PowerMode
  onUse: () => void
  onCancel: () => void
}

// Shows your secret power-up and the button to use it. Hammer and Brick switch the board into
// aiming mode; Gravity Flip fires right away.
export function PowerPanel({ power, used, canUse, mode, onUse, onCancel }: PanelProps) {
  const info = POWER_INFO[power]
  const aiming = mode !== 'drop'

  return (
    <div className={`toy flex items-center gap-3 rounded-2xl bg-surface p-2.5 pr-3 ${used ? 'opacity-60' : ''}`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-xl border-3 border-line bg-win text-on-accent">
        <PowerIcon kind={power} className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted">{used ? 'Used this round' : 'Your secret power-up'}</p>
        <p className="font-extrabold">{info.name}</p>
        <p className="text-sm text-muted">{aiming ? info.aim : info.description}</p>
      </div>
      {!used &&
        (aiming ? (
          <button onClick={onCancel} className="btn btn-plain shrink-0 text-sm">
            Cancel
          </button>
        ) : (
          <button
            onClick={onUse}
            disabled={!canUse}
            title={canUse ? undefined : 'You can use it on your turn.'}
            className="btn shrink-0 bg-win text-sm text-on-accent"
          >
            Use {info.name}
          </button>
        ))}
    </div>
  )
}
