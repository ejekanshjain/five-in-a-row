import type { CSSProperties } from 'react'

import type { Seat } from '@/lib/game'

type Props = { seat: Seat; className?: string; style?: CSSProperties; win?: boolean; last?: boolean }

// A glossy game disc. Styling lives in the .disc rules in globals.css.
export function Disc({ seat, className = '', style, win, last }: Props) {
  return (
    <span
      className={`disc ${className}`}
      data-seat={seat}
      data-win={win || undefined}
      data-last={last || undefined}
      style={style}
    />
  )
}
