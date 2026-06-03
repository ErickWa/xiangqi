# 象棋 · Xiangqi — Learn Chinese Chess

An interactive web app to help students learn Chinese Chess (象棋), with an AI strategy coach powered by Claude.

## Stack

- **Frontend**: React + Vite
- **Backend**: Cloudflare Pages Functions (Workers)
- **AI**: Claude API (`claude-sonnet-4-6`) with streaming + prompt caching

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

Create a `.dev.vars` file (gitignored) in the project root:

```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 3. Run locally

**Frontend only** (no AI analysis):
```bash
npm run dev
# open http://localhost:5173
```

**Full stack** (frontend + Cloudflare Functions + AI analysis):
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:pages
# open http://localhost:8788
```

> The `dev:pages` script runs `wrangler pages dev --proxy 5173 --port 8788`, which adds the Workers functions layer on top of the Vite dev server.

## Deploy to Cloudflare Pages

```bash
# One-time: create the Pages project
npx wrangler pages project create xiangqi

# Set your API key as a secret
npx wrangler pages secret put ANTHROPIC_API_KEY

# Build and deploy
npm run deploy
```

## Project Structure

```
src/
  components/
    Board.jsx          # SVG Xiangqi board with piece interaction
    Piece.jsx          # Individual piece rendering
    StrategyPanel.jsx  # AI coach panel with streaming analysis
  logic/
    gameState.js       # Board state, initial position, ASCII export
    moves.js           # Full move validation for all piece types
  App.jsx / App.css    # Root layout and styles

functions/
  api/
    analyze.js         # Cloudflare Pages Function → Claude API (streaming SSE)
```

## Rules Implemented

All standard Xiangqi rules including: rook, horse (with leg-block), elephant (cannot cross river, elbow-block), advisor (palace-confined), general (palace-confined, flying-general rule), cannon (screen capture), soldier (forward + sideways after crossing river). Moves that leave your own general in check are filtered out.
