import { applyMove, GameError, seatOf, toPublic } from '@/lib/game'
import { checkGameId, route, readJson } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { broadcast } from '@/lib/server/realtime'
import { updateGame } from '@/lib/server/store'

// Drops the caller's disc into a column. Body: { column } with column 0 to 8.
export const POST = route(async (request: Request, ctx: RouteContext<'/api/games/[id]/move'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const { column } = await readJson(request)
  const playerId = await getPlayerId()

  const game = await updateGame(id, game => {
    const seat = seatOf(game, playerId)
    if (!seat) throw new GameError('Only the two players in this game can make moves.', 403)
    applyMove(game, seat, column)
  })
  await broadcast(game)
  return Response.json({ game: toPublic(game) })
})
