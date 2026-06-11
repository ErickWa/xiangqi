// Local Xiangqi engine: material + piece-square evaluation, iterative-
// deepening negamax alpha-beta with capture quiescence, time-limited.
//
// Board: flat 90-entry array (index = row * 9 + col) of the type chars from
// logic/gameState (uppercase = Red). Moves are packed ints (from * 90 + to).
// Search uses pseudo-legal moves: a side that could capture the enemy general
// scores an immediate win, which makes moving into check a losing choice and
// enforces the flying-general rule via the general's file-capture move.

const VALUE = { K: 0, R: 900, C: 450, H: 400, P: 100, A: 200, E: 200 };
const MATE = 100000;
const TIME_UP = Symbol('time up');

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
// [leg dr, leg dc, dest dr, dest dc]
const HORSE = [
  [-1, 0, -2, -1], [-1, 0, -2, 1], [1, 0, 2, -1], [1, 0, 2, 1],
  [0, -1, -1, -2], [0, -1, 1, -2], [0, 1, -1, 2], [0, 1, 1, 2],
];

const isRed = p => p < 'a';

function toFlat(board) {
  const b = new Array(90).fill(null);
  for (const [key, piece] of Object.entries(board)) {
    const [r, c] = key.split(',').map(Number);
    b[r * 9 + c] = piece.type;
  }
  return b;
}

function genMoves(b, red) {
  const moves = [];
  const add = (f, r, c) => {
    if (r < 0 || r > 9 || c < 0 || c > 8) return;
    const q = b[r * 9 + c];
    if (!q || isRed(q) !== red) moves.push(f * 90 + r * 9 + c);
  };
  for (let f = 0; f < 90; f++) {
    const p = b[f];
    if (!p || isRed(p) !== red) continue;
    const r = (f / 9) | 0, c = f % 9;
    switch (p.toUpperCase()) {
      case 'R':
        for (const [dr, dc] of DIRS) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8) {
            const q = b[rr * 9 + cc];
            if (q) {
              if (isRed(q) !== red) moves.push(f * 90 + rr * 9 + cc);
              break;
            }
            moves.push(f * 90 + rr * 9 + cc);
            rr += dr; cc += dc;
          }
        }
        break;
      case 'C':
        for (const [dr, dc] of DIRS) {
          let rr = r + dr, cc = c + dc, jumped = false;
          while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8) {
            const q = b[rr * 9 + cc];
            if (!jumped) {
              if (q) jumped = true;
              else moves.push(f * 90 + rr * 9 + cc);
            } else if (q) {
              if (isRed(q) !== red) moves.push(f * 90 + rr * 9 + cc);
              break;
            }
            rr += dr; cc += dc;
          }
        }
        break;
      case 'H':
        for (const [lr, lc, dr, dc] of HORSE) {
          const er = r + lr, ec = c + lc;
          if (er < 0 || er > 9 || ec < 0 || ec > 8 || b[er * 9 + ec]) continue;
          add(f, r + dr, c + dc);
        }
        break;
      case 'E':
        for (const [dr, dc] of DIAG) {
          const tr = r + 2 * dr, tc = c + 2 * dc;
          if (tc < 0 || tc > 8) continue;
          if (red ? tr < 5 : tr > 4) continue;
          if (b[(r + dr) * 9 + c + dc]) continue;
          add(f, tr, tc);
        }
        break;
      case 'A':
        for (const [dr, dc] of DIAG) {
          const tr = r + dr, tc = c + dc;
          if (tc < 3 || tc > 5) continue;
          if (red ? tr < 7 || tr > 9 : tr < 0 || tr > 2) continue;
          add(f, tr, tc);
        }
        break;
      case 'K': {
        for (const [dr, dc] of DIRS) {
          const tr = r + dr, tc = c + dc;
          if (tc < 3 || tc > 5) continue;
          if (red ? tr < 7 || tr > 9 : tr < 0 || tr > 2) continue;
          add(f, tr, tc);
        }
        // Flying general: capture the opposing general on an open file.
        const dr = red ? -1 : 1;
        for (let rr = r + dr; rr >= 0 && rr <= 9; rr += dr) {
          const q = b[rr * 9 + c];
          if (q) {
            if (q.toUpperCase() === 'K') moves.push(f * 90 + rr * 9 + c);
            break;
          }
        }
        break;
      }
      case 'P': {
        add(f, r + (red ? -1 : 1), c);
        if (red ? r <= 4 : r >= 5) {
          add(f, r, c - 1);
          add(f, r, c + 1);
        }
        break;
      }
    }
  }
  return moves;
}

// Piece value plus a small computed piece-square bonus, from the owner's
// perspective (rr counts ranks from the owner's far side).
function pieceScore(p, r, c) {
  const red = isRed(p);
  const rr = red ? r : 9 - r;
  const t = p.toUpperCase();
  let v = VALUE[t];
  if (t === 'P') {
    if (rr <= 4) {
      v += 100 + (4 - rr) * 10;
      if (c >= 3 && c <= 5) v += 10;
    }
  } else if (t === 'H') {
    v += 4 * (4 - Math.abs(c - 4)) + (rr <= 4 ? 8 : 0);
  } else if (t === 'C') {
    if (c === 4) v += 10;
  } else if (t === 'R') {
    v += 2 * (4 - Math.abs(c - 4));
  }
  return v;
}

function evaluate(b, red) {
  let s = 0;
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (!p) continue;
    const v = pieceScore(p, (i / 9) | 0, i % 9);
    s += isRed(p) ? v : -v;
  }
  return red ? s : -s;
}

// Captures of the most valuable victims first.
function orderMoves(b, moves) {
  const victim = m => {
    const q = b[m % 90];
    return q ? VALUE[q.toUpperCase()] + (q.toUpperCase() === 'K' ? MATE : 0) : 0;
  };
  moves.sort((a, b2) => victim(b2) - victim(a));
}

let deadline = 0, nodes = 0;

function checkTime() {
  if ((++nodes & 1023) === 0 && Date.now() > deadline) throw TIME_UP;
}

function quiesce(b, red, alpha, beta, ply) {
  checkTime();
  const caps = genMoves(b, red).filter(m => b[m % 90]);
  const foeKing = red ? 'k' : 'K';
  for (const m of caps) if (b[m % 90] === foeKing) return MATE - ply;
  let best = evaluate(b, red);
  if (best >= beta) return best;
  if (best > alpha) alpha = best;
  orderMoves(b, caps);
  for (const m of caps) {
    const f = (m / 90) | 0, t = m % 90;
    const captured = b[t];
    b[t] = b[f]; b[f] = null;
    const score = -quiesce(b, !red, -beta, -alpha, ply + 1);
    b[f] = b[t]; b[t] = captured;
    if (score > best) {
      best = score;
      if (score > alpha) {
        alpha = score;
        if (alpha >= beta) break;
      }
    }
  }
  return best;
}

function search(b, red, depth, alpha, beta, ply, pv) {
  checkTime();
  if (depth <= 0) return quiesce(b, red, alpha, beta, ply);
  const moves = genMoves(b, red);
  const foeKing = red ? 'k' : 'K';
  for (const m of moves) if (b[m % 90] === foeKing) return MATE - ply;
  if (moves.length === 0) return -MATE + ply;
  orderMoves(b, moves);
  let best = -Infinity;
  for (const m of moves) {
    const f = (m / 90) | 0, t = m % 90;
    const captured = b[t];
    b[t] = b[f]; b[f] = null;
    const childPV = [];
    const score = -search(b, !red, depth - 1, -beta, -alpha, ply + 1, childPV);
    b[f] = b[t]; b[t] = captured;
    if (score > best) {
      best = score;
      if (score > alpha) {
        alpha = score;
        pv.length = 0;
        pv.push(m, ...childPV);
        if (alpha >= beta) break;
      }
    }
  }
  return best;
}

const unpack = m => {
  const f = (m / 90) | 0, t = m % 90;
  return { from: [(f / 9) | 0, f % 9], to: [(t / 9) | 0, t % 9] };
};

// {board, turn, limits} → {bestMove, score, pv, depth}
export function findBestMove(board, turn, { timeMs = 1500, maxDepth = 64 } = {}) {
  const b = toFlat(board);
  const red = turn === 'red';
  const ownKing = red ? 'K' : 'k';
  const rootMoves = genMoves(b, red).filter(m => {
    const f = (m / 90) | 0, t = m % 90;
    const captured = b[t];
    b[t] = b[f]; b[f] = null;
    const illegal = genMoves(b, !red).some(m2 => b[m2 % 90] === ownKing);
    b[f] = b[t]; b[t] = captured;
    return !illegal;
  });
  if (rootMoves.length === 0) return { bestMove: null, score: -MATE, pv: [], depth: 0 };
  orderMoves(b, rootMoves);

  deadline = Date.now() + timeMs;
  nodes = 0;
  let bestMove = rootMoves[0], bestScore = 0, bestPV = [rootMoves[0]], completed = 0;
  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -Infinity, iterBest = null, iterPV = [];
    try {
      for (const m of rootMoves) {
        const f = (m / 90) | 0, t = m % 90;
        const captured = b[t];
        b[t] = b[f]; b[f] = null;
        const childPV = [];
        const score = -search(b, !red, depth - 1, -Infinity, -alpha, 1, childPV);
        b[f] = b[t]; b[t] = captured;
        if (score > alpha) {
          alpha = score;
          iterBest = m;
          iterPV = [m, ...childPV];
        }
      }
    } catch (err) {
      if (err !== TIME_UP) throw err;
      break;
    }
    bestMove = iterBest;
    bestScore = alpha;
    bestPV = iterPV;
    completed = depth;
    // Search the best move first on the next iteration.
    rootMoves.splice(rootMoves.indexOf(iterBest), 1);
    rootMoves.unshift(iterBest);
    if (alpha >= MATE - 100 || Date.now() > deadline) break;
  }
  return { bestMove: unpack(bestMove), score: bestScore, pv: bestPV.map(unpack), depth: completed };
}
