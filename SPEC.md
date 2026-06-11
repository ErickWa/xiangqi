# Xiangqi Coach — Specification

This document is the single source of truth for what this app must become. An
iterative improvement loop reads this file, implements the highest-leverage
unchecked roadmap item, verifies it, checks it off, and commits.

## Vision

An **atomic, self-contained Chinese Chess coaching app**. A player improves by
playing against an AI opponent that plays winning strategy and *explains it
thoughtfully* — every game is a lesson. The app may initially rely on the
Claude API, but the end state runs entirely in the browser with no network
dependency: a static bundle that works offline. Claude remains an optional
enhancement, never a requirement.

## Definition of done

- [ ] A player can complete a full legal game vs the AI with all Xiangqi rules
      enforced (including check, checkmate, stalemate, perpetual-check/chase
      repetition, and the flying-general rule).
- [ ] The opponent is a **local engine** (no API call needed to play): plain JS
      evaluation + iterative-deepening alpha-beta search running in a Web
      Worker, with 3+ strength levels.
- [ ] Coaching works offline: move explanations, blunder warnings, and
      post-game review derived from engine analysis (principal variation, eval
      swings, hanging pieces, named opening patterns) rendered through a small
      template library.
- [ ] Pieces move visibly, not instantaneously: every move (player and AI)
      animates the piece gliding from origin to destination, captures and
      checks are emphasized, and the last move stays highlighted so the AI's
      reply is always easy to follow.
- [ ] The game is narrated as it unfolds: a running written commentary feed
      covers both sides' moves — the AI's plans *and* the player's moves —
      so a learner can read the story of the game while playing it.
- [ ] Claude-backed coaching is an optional enhancement behind a single flag;
      the app degrades gracefully when no API key / no network is present.
- [ ] `npm run build` produces a static bundle that is fully functional when
      served with no backend (Pages Functions optional).
- [ ] Rules engine has automated tests (move-generation counts from known
      positions, check/mate scenarios) and `npm test`, `npm run lint`,
      `npm run build` all pass.

## Coaching behavior

The opponent is a *teacher*, not just an adversary:

1. **Plays principled, winning chess** at the selected strength; at lower
   strengths it weakens by limiting search depth/time, never by playing
   nonsense moves.
2. **Explains its plan** after each of its moves in 1–2 sentences (what the
   move threatens or prepares), at a level matched to the player.
3. **Flags player mistakes**: when the player's move drops the eval beyond a
   threshold, show what was better and why (from the PV), without being
   preachy. Offer takeback.
4. **Post-game review**: the 3 most consequential moments of the game, each
   with the better line.
5. **Openings**: recognizes and names common openings (central cannon, screen
   horses, etc.) with a one-line idea for each.
6. **Narrates continuously**: the commentary feed reads as a running account
   of the game, not just isolated AI-move captions — it acknowledges the
   player's moves (captures, checks, developing moves, threats created or
   answered) in plain language matched to the player's level.

## Interaction feel

Moves must be *watchable*. A teaching app fails if the student can't see what
just happened:

- A moved piece glides from its origin to its destination over roughly
  250–350ms (CSS transition; no animation library) rather than teleporting.
- The AI's move begins after a brief beat so it reads as a response, and its
  origin/destination squares stay highlighted until the player moves.
- Captures get a visible emphasis (e.g. the captured piece fades out);
  check gets a distinct cue on the threatened general.
- Input is locked only while a piece is in flight; the UI must never feel
  laggy because of animation.
- A **Back** button rewinds to the player's previous turn at any time (vs the
  AI it undoes the move pair); the blunder takeback is the same rewind.

## Architecture

```
src/
  logic/        pure game rules (board, move gen, check/mate, repetition)
  engine/       evaluation + search, loaded in a Web Worker
  coach/        analysis → human explanation (templates; optional Claude)
  components/   Board, Piece, panels — thin views over logic state
functions/api/  optional Claude proxy (coach enhancement only)
```

- Board state: single 10×9 representation owned by `logic/`; everything else
  consumes it. No duplicated state.
- The engine speaks one message shape over the Worker boundary:
  `{position, limits} → {bestMove, score, pv, depth}`.
- The coach consumes engine output; it never computes chess itself.

## Engineering constraints (apply to every change)

- **Minimum code for the goal.** Prefer deleting and simplifying over adding.
  Target: `src/` stays under ~3,000 lines total.
- **No new runtime dependencies.** React + the Anthropic SDK (server-side
  only) are the whole dependency budget. The engine is plain JS.
- **Performance:** engine search must not block the UI (Worker); move
  responses within ~2s at default strength on a laptop.
- **Every iteration ends green:** `npm run lint && npm run build` (and
  `npm test` once tests exist) must pass before commit.
- When Claude is used, use current model IDs only: `claude-opus-4-8` for
  coaching commentary (no date suffixes, no retired 3.x models).

## Roadmap

Work top to bottom; fix anything broken first.

- [x] **Fix the broken opponent**: `functions/api/move.js` calls retired model
      `claude-3-5-sonnet-20241022` (404s). Centralize the model ID in one
      constant shared by both functions and update to a current model.
- [x] **Complete the rules engine** in `src/logic/`: verify all piece moves,
      add check detection, checkmate/stalemate, flying-general, and
      repetition/perpetual-check draw rules. Pure functions, no UI coupling.
- [x] **Add rules tests**: `node --test` suite with move-generation counts
      from the start position and a handful of tactical positions; wire up
      `npm test`.
- [x] **Local engine v1** (`src/engine/`): material + piece-square evaluation,
      iterative-deepening alpha-beta with capture quiescence, time-limited,
      in a Web Worker. Replace the `/api/move` opponent with it; delete
      `functions/api/move.js`.
- [x] **Strength levels**: 3+ levels via search time/depth, selectable in UI.
- [x] **Offline coach v1** (`src/coach/`): move explanations and blunder
      detection from engine output (eval delta, PV, threatened pieces) via
      templates; takeback on blunders.
- [x] **Animated movement**: pieces glide between intersections per the
      "Interaction feel" section (CSS transitions only, no new dependencies);
      capture fade, check cue, persistent last-move highlight, input locked
      during flight.
- [x] **Full-game narration**: extend the coach feed to narrate the player's
      moves too (captures, checks, threats made/answered, development), so
      the feed reads as a continuous account of the game.
- [ ] **Opening book**: small data table of common openings with names and
      one-line ideas; coach announces recognized openings.
- [ ] **Post-game review**: top-3 consequential moments with better lines.
- [ ] **Claude as optional enhancement**: gate `/api/analyze` behind a flag;
      app fully functional without it; graceful offline degradation.
- [ ] **Simplification pass**: remove dead code, collapse needless
      abstractions, confirm `src/` LOC budget, update README to match reality.

## Progress log

(append one line per completed iteration: date — what changed)

- 2026-06-10 — Replaced retired model with `claude-opus-4-8` via shared
  `functions/api/_model.js`; fixed pre-existing lint error in App.jsx by
  deriving `aiThinking` instead of storing it as state.
- 2026-06-10 — Completed rules engine: pure `makeMove` reducer in logic/
  resolves checkmate, stalemate (loss), repetition draw, and perpetual-check
  loss; App handlers are now thin wrappers. Fixed bug where the AI stopped
  moving while in check.
- 2026-06-11 — review: found and fixed play continuing after game over
  (guard in `makeMove` + board disabled); eslint now ignores `.wrangler`
  artifacts; banner cleanup. No scope creep; src/ at 760 lines (budget 3,000).
- 2026-06-11 — user-reported fix: AI toggle kept switching off mid-game.
  Cause: low-tier API key (5 req/min) → 429s on /api/move treated as fatal.
  AI moves now retry up to 3× after the rate-limit window before disabling.
  (The local engine roadmap item removes this failure mode entirely.)
- 2026-06-11 — Added 9-test rules suite (`npm test`): start-position move
  counts (44/side), cannon screens, flying general, mate/stalemate,
  repetition, perpetual check, soldier river rules. The suite caught a real
  bug: perpetual check was misjudged as a draw when the escaping side
  completed the third repetition — `repetitionLoser` now examines both
  sides' moves within the cycle.
- 2026-06-11 — user-reported fix: AI gave up after one quick failure because
  the retry counter never reset across games/toggles; verified the model
  call itself returns clean JSON. Retry counter now resets on toggle and
  New Game, and the failing error is shown in a banner instead of only the
  console.
- 2026-06-11 — review: retry/error handling and test suite are sound; only
  fix needed was clearing the stale AI-error banner on New Game. No dead
  code or scope creep; src/ at 1,122 lines (budget 3,000).
- 2026-06-11 — Local engine v1: `src/engine/engine.js` (flat-array movegen
  with flying-general-as-king-capture, material + computed piece-square eval,
  iterative-deepening negamax with capture quiescence, time-limited) behind
  a Web Worker speaking `{position, limits} → {bestMove, score, pv, depth}`.
  Reaches depth 5 in 1.5s from the start position. App now uses the worker;
  `/api/move` and its rate-limit retry machinery deleted (also removes the
  network-block failure mode seen earlier today). 4 engine tests added.
- 2026-06-11 — Strength levels: 初级/中级/高级 selector in the header maps to
  engine limits (depth 2/250ms, depth 4/700ms, depth 64/1500ms); strength
  varies only by search depth/time per the coaching spec.
- 2026-06-11 — review: engine + levels diff is sound (movegen bounds, time
  abort, PV handling all verified); only cleanup was un-exporting the
  internal `toFlat`. Known limitation noted: the engine has no repetition
  history, so it could theoretically lose by the perpetual-check rule —
  revisit if observed in play. src/ at 1,477 lines (budget 3,000).
- 2026-06-11 — Offline coach v1: `src/coach/coach.js` templates narrate each
  AI move (capture/check, PV-based plan, position stance) in a feed in the
  strategy panel; blunder detection compares consecutive search scores
  against the expected PV reply (zero extra search) and offers takeback of
  the move pair. Also fixed user-reported layout shift by giving banners a
  fixed-height status strip. 8 coach tests added (21 total).
- 2026-06-11 — spec amended (user request): animated piece movement and
  full-game narration added to definition of done, coaching behavior, a new
  "Interaction feel" section, and the roadmap (queued ahead of opening book).
- 2026-06-11 — Animated movement: pieces get stable ids so Board keys them by
  identity and a 300ms CSS transform transition makes moves glide; `makeMove`
  records `lastMove` (origin dot + destination ring stay until the next move);
  captured piece fades out under the capturer; threatened general pulses;
  input locked 320ms while a piece is in flight; AI reply waits out a 450ms
  beat so it reads as a response. src/ at 1,764 lines (budget 3,000).
- 2026-06-11 — review: coach + animation diff is sound (worker/beat cleanup,
  capture-fade edge cases, flight lock all verified). One real bug fixed: a
  declined takeback offer stayed clickable after the player's next move and
  would have reverted the wrong move pair — offers now expire on the player's
  next move. Valid-move dots now respect `disabled` (defensive). src/ at
  1,769 lines (budget 3,000).
- 2026-06-11 — user request: axis labels on the board (columns a–i along the
  bottom, rows 0–9 down the left) matching move notation, so feed entries
  like 炮b7→e7 can be located at a glance.
- 2026-06-11 — Full-game narration: `explainPlayerMove` template narrates the
  player's moves (capture, check given, check answered, river crossing) from
  logic-state facts computed in App; feed now alternates You/AI lines and only
  narrates when the AI opponent is on (the coach speaks as the opponent).
  4 tests added (25 total). src/ at 1,848 lines (budget 3,000).
- 2026-06-11 — user request: Back button rewinds to the player's previous
  turn (undoes the AI-reply/player-move pair, or one move with AI off) via a
  history stack of pre-move snapshots; blunder takeback now reuses the same
  rewind, replacing the single-snapshot mechanism. Works mid-search and
  after game over.
- 2026-06-11 — review: axis labels, player narration, and rewind stack all
  verified (rewind-during-search cancellation, stack termination on red-turn
  states, takeback-offer expiry); nothing to fix. Moving on to a work
  iteration per the loop prompt.
