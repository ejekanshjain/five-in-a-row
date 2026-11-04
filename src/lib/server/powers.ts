import 'server-only'

import { randomInt } from 'node:crypto'

import { POWER_KINDS, type PowerKind } from '@/lib/game'

// Picks a random power-up for a player. Uses crypto so nobody can predict the next deal.
export const drawPower = (): PowerKind => POWER_KINDS[randomInt(POWER_KINDS.length)]
