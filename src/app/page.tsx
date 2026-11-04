import { CreateGameForm } from '@/components/create-game-form'
import { Disc } from '@/components/disc'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="space-y-4">
        <div className="flex gap-1.5" aria-hidden>
          {(['p1', 'p2', 'p1', 'p2', 'p1'] as const).map((seat, i) => (
            <Disc key={i} seat={seat} className="size-6" />
          ))}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">5 in a Row</h1>
        <p className="text-muted">
          Drop discs into a 9 by 8 board. Line up five across, down, or diagonally before your opponent does.
        </p>
      </div>
      <CreateGameForm />
    </main>
  )
}
