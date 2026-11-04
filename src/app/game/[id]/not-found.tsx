import Link from 'next/link'

export default function GameNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Game Not Found</h1>
      <p className="text-muted">This game link is wrong, or the game expired after a day without moves.</p>
      <Link href="/" className="rounded-lg bg-white px-4 py-2 font-medium text-bg hover:bg-white/90">
        Start a New Game
      </Link>
    </div>
  )
}
