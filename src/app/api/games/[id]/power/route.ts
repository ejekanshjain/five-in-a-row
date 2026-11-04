import { GameError, seatOf, toPublic, usePower } from '@/lib/game'
import { checkGameId, route, readJson } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { broadcast } from '@/lib/server/realtime'
import { updateGame } from '@/lib/server/store'

// Uses the caller's secret power-up. Body: { target } with a cell index for the hammer or a
// column for the brick. The server decides which power-up the caller has, never the browser.
export const POST = route(async (request: Request, ctx: RouteContext<'/api/games/[id]/power'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const { target } = await readJson(request)
  const playerId = await getPlayerId()

  const game = await updateGame(id, game => {
    const seat = seatOf(game, playerId)
    if (!seat) throw new GameError('Only the two players in this game can use power-ups.', 403)
    usePower(game, seat, target)
  })
  await broadcast(game)
  return Response.json({ game: toPublic(game) })
})
