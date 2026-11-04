import type { CSSProperties } from 'react'

import type { Seat } from '@/lib/game'

type Props = { seat: Seat; className?: string; style?: CSSProperties; win?: boolean }

// A glossy game disc. Styling lives in the .disc rules in globals.css.
export function Disc({ seat, className = '', style, win }: Props) {
  return <span className={`disc ${className}`} data-seat={seat} data-win={win || undefined} style={style} />
}
