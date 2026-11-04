# 5 in a Row

A real-time, two-player game. Players take turns dropping discs into a 9 by 8 board, and the first to line up five across, down, or diagonally wins.

## How It Works

- Next.js route handlers enforce every rule. Browsers only send actions and render the state they get back.
- Games live in Upstash Redis and expire after 24 hours without activity.
- Pusher presence channels push each new game state to both players and show who is online.
- Each browser gets an http-only player cookie, which decides the seat it plays.

## Setup

Create `.env.local` with your credentials:

```bash
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_SECRET="your_pusher_secret"
NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
NEXT_PUBLIC_PUSHER_CLUSTER="your_pusher_cluster"
UPSTASH_REDIS_REST_URL="your_upstash_rest_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"
```

Then install and run:

```bash
bun install
bun run dev
```

To play against yourself, open the game link in a second browser or a private window. The player cookie is shared across tabs of the same browser.

## Scripts

- `bun run test` runs the game rule tests.
- `bun run typecheck` checks types.
- `bun run lint` runs ESLint.
