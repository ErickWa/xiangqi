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
- [ ] **Local engine v1** (`src/engine/`): material + piece-square evaluation,
      iterative-deepening alpha-beta with capture quiescence, time-limited,
      in a Web Worker. Replace the `/api/move` opponent with it; delete
      `functions/api/move.js`.
- [ ] **Strength levels**: 3+ levels via search time/depth, selectable in UI.
- [ ] **Offline coach v1** (`src/coach/`): move explanations and blunder
      detection from engine output (eval delta, PV, threatened pieces) via
      templates; takeback on blunders.
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
