# 象棋 · Xiangqi — Learn Chinese Chess

An atomic, self-contained Chinese Chess coaching app. You play against a
**local engine** that runs entirely in your browser, while an **offline coach**
narrates the game as it unfolds — openings, plans, blunders, and a post-game
review — so every game is a lesson. No network or API key required.

## Features

- **Full rules engine**: all piece moves, check/checkmate/stalemate,
  flying-general, repetition draws, and perpetual-check losses.
- **Local AI opponent**: iterative-deepening alpha-beta search with capture
  quiescence, running in a Web Worker. Three strength levels (初级/中级/高级)
  that vary only by search depth/time — never by playing nonsense.
- **Offline coach feed**: narrates both sides' moves, names recognized
  openings (central cannon, screen horses, …), flags blunders with the better
  line and a take-back offer, and ends with a top-3-moments post-game review.
- **Watchable moves**: pieces glide between intersections, captures fade out,
  checks pulse, and the last move stays highlighted. A Back button rewinds to
  your previous turn at any time.
- **Optional Claude analysis**: an extra "Analyze" panel backed by a
  Cloudflare Pages Function calling `claude-opus-4-8`. Entirely optional —
  build with `VITE_CLAUDE_COACH=off` to compile it out, and it degrades
  gracefully when offline or unconfigured.

## Getting started

```bash
npm install
npm run dev        # open http://localhost:5173 — fully functional, no backend
```

```bash
npm test           # rules / engine / coach test suite (node --test)
npm run lint
npm run build      # static bundle in dist/ — works served from any file host
```

## Optional: Claude analysis panel

The app never requires this. To enable it locally:

1. Create a `.dev.vars` file (gitignored): `ANTHROPIC_API_KEY=sk-ant-…`
2. Run the functions layer alongside Vite:

```bash
npm run dev        # terminal 1
npm run dev:pages  # terminal 2 — open http://localhost:8788
```

To deploy on Cloudflare Pages:

```bash
npx wrangler pages project create xiangqi   # one-time
npx wrangler pages secret put ANTHROPIC_API_KEY
npm run deploy
```

## Project structure

```
src/
  logic/        pure game rules (board, move gen, check/mate, repetition)
  engine/       evaluation + search, loaded in a Web Worker
  coach/        engine analysis → human explanations (templates, opening book)
  components/   Board, Piece, StrategyPanel — thin views over logic state
functions/api/  optional Claude proxy (analysis panel only)
```

Board state lives in a single 10×9 representation owned by `logic/`. The
engine speaks one message shape over the Worker boundary
(`{position, limits} → {bestMove, score, pv, depth}`), and the coach consumes
engine output — it never computes chess itself.
