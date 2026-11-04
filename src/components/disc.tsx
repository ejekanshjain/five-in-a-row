import type { CSSProperties } from 'react'

import type { Seat } from '@/lib/game'

const COLORS: Record<Seat, string> = {
  p1: 'bg-p1 shadow-[inset_0_-4px_0_rgb(0_0_0/0.25)]',
  p2: 'bg-p2 shadow-[inset_0_-4px_0_rgb(0_0_0/0.25)]'
}

export function Disc({ seat, className = '', style }: { seat: Seat; className?: string; style?: CSSProperties }) {
  return <span className={`block rounded-full ${COLORS[seat]} ${className}`} style={style} />
}
