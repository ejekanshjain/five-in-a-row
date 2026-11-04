'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'

const NAME_KEY = 'fiar_name'

// Asks for a display name and remembers it in this browser for the next game.
export function NameForm({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (name: string) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY)
      if (saved && input.current && !input.current.value) input.current.value = saved
    } catch {}
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim()
    try {
      localStorage.setItem(NAME_KEY, name)
    } catch {}
    setBusy(true)
    setError(null)
    try {
      await onSubmit(name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="name" className="text-sm font-medium">
        Your Name
      </label>
      <div className="flex gap-2">
        <input
          ref={input}
          id="name"
          name="name"
          required
          maxLength={20}
          autoComplete="nickname"
          placeholder="e.g. Priya"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-white/40"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-white px-4 py-2 font-medium text-bg hover:bg-white/90 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-p1">
          {error}
        </p>
      )}
    </form>
  )
}
