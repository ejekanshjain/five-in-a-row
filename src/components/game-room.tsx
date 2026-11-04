'use client'

import Link from 'next/link'
import Pusher, { type PresenceChannel } from 'pusher-js'
import { useCallback, useEffect, useState } from 'react'

import { Board } from '@/components/board'
import { Disc } from '@/components/disc'
import { NameForm } from '@/components/name-form'
import { PowerCard, PowerIcon, type PowerMode } from '@/components/power-ups'
import { ThemeToggle } from '@/components/theme-toggle'
import { postJson } from '@/lib/api'
import { COLS, other, type PowerKind, type PublicGame, type Seat } from '@/lib/game'
import { gameChannel } from '@/lib/realtime'

type Props = { initialGame: PublicGame; initialYou: Seat | null }
type GameResponse = { game: PublicGame; you?: Seat | null }

// Live game screen. The server owns the game: this component sends actions to the API and
// renders whatever state the server sends back or broadcasts through Pusher.
export function GameRoom({ initialGame, initialYou }: Props) {
  const gameId = initialGame.id
  const [game, setGame] = useState(initialGame)
  const [you, setYou] = useState(initialYou)
  const [online, setOnline] = useState<Seat[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<PowerMode>('drop')

  // Broadcasts and API responses can arrive in either order, so keep the newest version.
  const apply = useCallback((next: PublicGame) => {
    setGame(current => (next.version >= current.version ? next : current))
  }, [])

  // Reconnects whenever `you` changes, so joining re-enters the channel as a player, not a spectator.
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' }
    })
    const channel = pusher.subscribe(gameChannel(gameId)) as PresenceChannel

    const syncMembers = () => {
      const seats: Seat[] = []
      channel.members.each((member: { id: string }) => {
        if (member.id === 'p1' || member.id === 'p2') seats.push(member.id)
      })
      setOnline(seats)
    }
    // Catch up on anything broadcast before this subscription started or while disconnected.
    const refresh = async () => {
      const res = await fetch(`/api/games/${gameId}`, { cache: 'no-store' })
      if (res.ok) apply(((await res.json()) as GameResponse).game)
    }

    channel.bind('pusher:subscription_succeeded', () => {
      syncMembers()
      void refresh()
    })
    channel.bind('pusher:member_added', syncMembers)
    channel.bind('pusher:member_removed', syncMembers)
    channel.bind('state', apply)
    return () => pusher.disconnect()
  }, [gameId, you, apply])

  const send = useCallback(
    async (action: string, body?: object) => {
      setBusy(true)
      setError(null)
      try {
        const data = await postJson<GameResponse>(`/api/games/${gameId}/${action}`, body)
        apply(data.game)
        if (data.you) setYou(data.you)
        setMode('drop')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [gameId, apply]
  )

  const canMove = game.status === 'playing' && game.turn === you && !busy
  const myPower = you ? game.powers[you] : null
  const powerUsed = you ? !!game.powerUsed[you] : true
  const canUsePower = canMove && !powerUsed && !!myPower
  // Aiming only lasts while you can still use the power-up.
  const activeMode: PowerMode = canUsePower ? mode : 'drop'

  const onColumn = useCallback((col: number) => send('move', { column: col }), [send])

  // Keys 1 to 9 pick those columns, 0 picks column 10, and Esc cancels aiming a power-up.
  useEffect(() => {
    if (!canMove) return
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.key === 'Escape') return setMode('drop')
      if (!/^\d$/.test(event.key) || activeMode === 'hammer') return
      const col = event.key === '0' ? 9 : Number(event.key) - 1
      if (col < COLS) void onColumn(col)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canMove, activeMode, onColumn])

  function usePowerUp() {
    if (myPower === 'hammer') setMode('hammer')
    else if (myPower) void send('power')
  }

  const finished = game.status === 'won' || game.status === 'draw'

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Disc seat="p1" className="size-6" />5 in a Row
        </Link>
        <div className="flex items-center gap-2">
          {game.status !== 'waiting' && <CopyLink label="Copy Link" />}
          <ThemeToggle />
        </div>
      </header>

      {/* On large screens the status and power-ups sit in a right-hand column, so the board stays
          in place while they change size between turns. On phones both columns use
          display: contents, so the order classes stack: players, status, board, hint, power-ups. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-6">
          <div className="order-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <PlayerCard game={game} seat="p1" you={you} online={online.includes('p1')} />
            <span className="text-lg font-extrabold text-muted">vs</span>
            <PlayerCard game={game} seat="p2" you={you} online={online.includes('p2')} />
          </div>

          <div className="order-3">
            <Board
              game={game}
              you={you}
              canMove={canMove}
              mode={activeMode}
              onColumn={onColumn}
              onSmash={index => send('power', { target: index })}
            />
          </div>

          <p className="order-4 text-center text-sm text-muted">
            {canMove && activeMode === 'drop'
              ? 'Click a column, or press 1 to 9 (0 is column 10).'
              : `Line up ${game.winLength === 4 ? 'four' : 'five'} across, down, or diagonally.`}
            {game.score.draws > 0 && ` Draws so far: ${game.score.draws}.`}
          </p>
        </div>

        <div className="contents lg:sticky lg:top-6 lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-4">
          <section aria-live="polite" className="order-2 flex min-h-20 flex-col items-center justify-center gap-3 text-center">
            <Announcement game={game} you={you} />
            <Status game={game} you={you} />
            {game.winLength === 4 && game.status === 'playing' && (
              <p className="inline-flex items-center gap-2 rounded-full border-3 border-dashed border-line px-3.5 py-1 text-sm font-extrabold">
                <PowerIcon kind="four" className="size-4" />
                Four in a row wins this round
              </p>
            )}
            {!you && game.status === 'waiting' && (
              <div className="w-full max-w-sm text-left">
                <NameForm submitLabel="Join Game" onSubmit={name => send('join', { name })} />
              </div>
            )}
            {you && finished && (
              <RematchControls game={game} you={you} busy={busy} onRematch={() => send('rematch')} />
            )}
            {error && (
              <p role="alert" className="font-semibold text-p1">
                {error}
              </p>
            )}
          </section>

          {game.status !== 'waiting' && (
            <div className="order-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {/* Your own card comes first. */}
              {(you === 'p2' ? (['p2', 'p1'] as const) : (['p1', 'p2'] as const)).map(seat => (
                <PowerCard
                  key={seat}
                  game={game}
                  seat={seat}
                  you={you}
                  canUse={canUsePower}
                  mode={activeMode}
                  onUse={usePowerUp}
                  onCancel={() => setMode('drop')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const ANNOUNCEMENTS: Record<PowerKind, string> = {
  hammer: 'smashed a piece with the Hammer!',
  flip: 'flipped the board!',
  four: 'switched the game to four in a row!'
}

// Calls out the power-up used on the last turn, so nobody misses why the board changed.
function Announcement({ game, you }: { game: PublicGame; you: Seat | null }) {
  const action = game.lastAction
  if (!action || action.kind === 'drop') return null
  const who = action.seat === you ? 'You' : (game.players[action.seat]?.name ?? 'Player')
  return (
    <p
      key={game.version}
      className="pop inline-flex items-center gap-2 rounded-2xl border-3 border-line bg-win px-3.5 py-1.5 text-sm font-extrabold text-on-accent"
    >
      <PowerIcon kind={action.kind} className="size-5" />
      {who} {ANNOUNCEMENTS[action.kind]}
    </p>
  )
}

function Status({ game, you }: { game: PublicGame; you: Seat | null }) {
  const name = (seat: Seat) => game.players[seat]?.name ?? 'Player'

  if (game.status === 'won') {
    const lost = you && game.winner !== you
    return (
      <div key={game.version} className="pop space-y-1">
        <p className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-4xl">
          {game.winner === you ? 'You win!' : `${name(game.winner!)} wins!`}
        </p>
        {lost && <p className="text-muted">Ask for a rematch to get even.</p>}
      </div>
    )
  }
  if (game.status === 'draw') {
    return (
      <div key={game.version} className="pop space-y-1">
        <p className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-4xl">Draw!</p>
        <p className="text-muted">The board is full and nobody lined up five.</p>
      </div>
    )
  }
  if (game.status === 'waiting') {
    if (!you) return <p className="text-xl font-bold">{name('p1')} is looking for an opponent.</p>
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-2xl font-extrabold tracking-tight">Waiting for an opponent</p>
        <p className="text-muted">Send the link to a colleague. The game starts when they join.</p>
        <CopyLink label="Copy Invite Link" primary />
      </div>
    )
  }

  const label = game.turn === you ? 'Your turn' : you ? `${name(game.turn)} is thinking…` : `${name(game.turn)}'s turn`
  return (
    <p
      key={`${game.turn}-${game.version}`}
      className="toy pop inline-flex items-center gap-2.5 rounded-full py-2 pr-5 pl-2.5 text-lg font-extrabold text-on-accent"
      style={{ background: `var(--${game.turn})` }}
    >
      <Disc seat={game.turn} className="size-7 border-2" />
      {label}
    </p>
  )
}

type CardProps = { game: PublicGame; seat: Seat; you: Seat | null; online: boolean }

function PlayerCard({ game, seat, you, online }: CardProps) {
  const player = game.players[seat]
  const active = game.status === 'playing' && game.turn === seat
  const winner = game.winner === seat
  return (
    <div
      className={`toy flex min-w-0 items-center gap-2.5 rounded-2xl p-2.5 transition-all duration-200 sm:gap-3 sm:p-3 ${active ? '-translate-y-1.5 shadow-[0_9px_0_var(--shadow)]' : ''}`}
      style={{
        background: active || winner ? `color-mix(in srgb, var(--${seat}) 24%, var(--surface))` : 'var(--surface)'
      }}
    >
      <Disc seat={seat} className={`size-9 shrink-0 sm:size-11 ${active ? 'bob' : ''}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">{player?.name ?? 'Open seat'}</p>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          {player && (
            <span
              className={`size-2 shrink-0 rounded-full border-[1.5px] border-line ${online ? 'bg-p2' : 'bg-transparent'}`}
            />
          )}
          <span className="truncate">
            {seat === you ? 'You' : player ? (online ? 'Online' : 'Offline') : 'Waiting to join'}
          </span>
        </p>
      </div>
      <p className="text-3xl font-extrabold tabular-nums sm:text-4xl" aria-label={`${game.score[seat]} wins`}>
        {game.score[seat]}
      </p>
    </div>
  )
}

function RematchControls({ game, you, busy, onRematch }: { game: PublicGame; you: Seat; busy: boolean; onRematch: () => void }) {
  const opponent = game.players[other(you)]?.name ?? 'Your opponent'
  if (game.rematch.includes(you)) return <p className="font-semibold text-muted">Waiting for {opponent} to accept the rematch.</p>

  const asked = game.rematch.includes(other(you))
  return (
    <div className="flex flex-col items-center gap-2">
      {asked && <p className="font-semibold">{opponent} wants a rematch.</p>}
      <button onClick={onRematch} disabled={busy} className="btn btn-primary text-lg">
        {asked ? 'Accept Rematch' : 'Rematch'}
      </button>
    </div>
  )
}

function CopyLink({ label, primary }: { label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className={`btn ${primary ? 'btn-primary text-lg' : 'btn-plain text-sm'}`}
    >
      {copied ? 'Link Copied' : label}
    </button>
  )
}
