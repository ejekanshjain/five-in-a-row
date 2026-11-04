import { GameError, requestRematch, seatOf, toPublic } from '@/lib/game'
import { checkGameId, route } from '@/lib/server/http'
import { getPlayerId } from '@/lib/server/player'
import { drawPower } from '@/lib/server/powers'
import { broadcast } from '@/lib/server/realtime'
import { updateGame } from '@/lib/server/store'

// Asks for a rematch. The board resets and new power-ups are dealt once both players have asked.
export const POST = route(async (_request: Request, ctx: RouteContext<'/api/games/[id]/rematch'>) => {
  const { id } = await ctx.params
  checkGameId(id)
  const playerId = await getPlayerId()

  const game = await updateGame(id, game => {
    const seat = seatOf(game, playerId)
    if (!seat) throw new GameError('Only the two players in this game can ask for a rematch.', 403)
    requestRematch(game, seat, drawPower)
  })
  await broadcast(game)
  return Response.json({ game: toPublic(game) })
})
