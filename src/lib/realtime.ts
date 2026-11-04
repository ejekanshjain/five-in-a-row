// Channel naming shared by the server (which broadcasts and authorizes) and the browser (which subscribes).

export const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{10}$/

export const gameChannel = (gameId: string) => `presence-game-${gameId}`

export function gameIdFromChannel(channel: string): string | null {
  const match = /^presence-game-(.+)$/.exec(channel)
  return match && GAME_ID_PATTERN.test(match[1]) ? match[1] : null
}
