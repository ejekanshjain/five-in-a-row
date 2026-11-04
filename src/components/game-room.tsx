'use client'

import Link from 'next/link'
import Pusher, { type PresenceChannel } from 'pusher-js'
import { useCallback, useEffect, useState } from 'react'

import { Board } from '@/components/board'
import { Disc } from '@/components/disc'
import { NameForm } from '@/components/name-form'
import { postJson } from '@/lib/api'
import { COLS, other, type PublicGame, type Seat } from '@/lib/game'
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
      if (!res.ok) return
      const data = (await res.json()) as GameResponse
      apply(data.game)
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [gameId, apply]
  )

  const canMove = game.status === 'playing' && game.turn === you && !busy

  // Number keys 1 to 9 drop a disc in that column.
  useEffect(() => {
    if (!canMove) return
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      const col = Number(event.key) - 1
      if (Number.isInteger(col) && col >= 0 && col < COLS) void send('move', { column: col })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canMove, send])

  const canJoin = !you && game.status === 'waiting' && !game.players.p2

  return (
    <>
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          5 in a Row
        </Link>
        <CopyLink />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <PlayerCard game={game} seat="p1" you={you} online={online.includes('p1')} />
        <PlayerCard game={game} seat="p2" you={you} online={online.includes('p2')} />
      </div>

      <section aria-live="polite" className="flex min-h-12 flex-col items-center gap-3 text-center">
        <p className="text-lg font-medium">{headline(game, you)}</p>
        {canJoin && (
          <div className="w-full max-w-sm text-left">
            <NameForm submitLabel="Join Game" onSubmit={name => send('join', { name })} />
          </div>
        )}
        {you && (game.status === 'won' || game.status === 'draw') && (
          <RematchControls game={game} you={you} busy={busy} onRematch={() => send('rematch')} />
        )}
        {error && (
          <p role="alert" className="text-sm text-p1">
            {error}
          </p>
        )}
      </section>

      <Board game={game} you={you} canMove={canMove} onDrop={col => send('move', { column: col })} />

      {canMove && <p className="text-center text-sm text-muted">Click a column or press 1 to 9.</p>}
    </>
  )
}

function headline(game: PublicGame, you: Seat | null): string {
  const name = (seat: Seat) => game.players[seat]?.name ?? 'Player'
  switch (game.status) {
    case 'waiting':
      return you ? 'Waiting for an opponent. Send this page link to a colleague.' : 'Join to play against ' + name('p1') + '.'
    case 'playing':
      if (game.turn === you) return 'Your turn.'
      return you ? `Waiting for ${name(game.turn)} to move.` : `${name(game.turn)} to move.`
    case 'won':
      if (game.winner === you) return 'You win!'
      return `${name(game.winner!)} wins.`
    case 'draw':
      return 'Draw. The board is full.'
  }
}

function PlayerCard({ game, seat, you, online }: { game: PublicGame; seat: Seat; you: Seat | null; online: boolean }) {
  const player = game.players[seat]
  const active = game.status === 'playing' && game.turn === seat
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors ${active ? 'border-white/50' : 'border-line'}`}
    >
      <Disc seat={seat} className="size-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {player?.name ?? 'Open seat'}
          {seat === you && <span className="ml-1.5 text-xs text-muted">(you)</span>}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {player && (
            <span
              className={`size-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-muted/50'}`}
              title={online ? 'Online' : 'Offline'}
            />
          )}
          {player ? (online ? 'Online' : 'Offline') : 'Waiting to join'}
        </p>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums" aria-label={`${game.score[seat]} wins`}>
        {game.score[seat]}
      </p>
    </div>
  )
}

function RematchControls({ game, you, busy, onRematch }: { game: PublicGame; you: Seat; busy: boolean; onRematch: () => void }) {
  const opponent = game.players[other(you)]?.name ?? 'Your opponent'
  if (game.rematch.includes(you)) return <p className="text-sm text-muted">Waiting for {opponent} to accept the rematch.</p>

  const asked = game.rematch.includes(other(you))
  return (
    <div className="flex flex-col items-center gap-2">
      {asked && <p className="text-sm text-muted">{opponent} wants a rematch.</p>}
      <button
        onClick={onRematch}
        disabled={busy}
        className="rounded-lg bg-white px-4 py-2 font-medium text-bg hover:bg-white/90 disabled:opacity-50"
      >
        {asked ? 'Accept Rematch' : 'Rematch'}
      </button>
    </div>
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface"
    >
      {copied ? 'Link Copied' : 'Copy Game Link'}
    </button>
  )
}
