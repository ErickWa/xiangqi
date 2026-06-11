import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../logic/gameState.js';
import { getValidMoves, makeMove } from '../logic/moves.js';
import { findBestMove } from './engine.js';

// Sparse board builder: pieces is { 'row,col': type }. Uppercase = red.
function board(pieces) {
  const b = {};
  for (const [key, type] of Object.entries(pieces)) {
    b[key] = { type, color: type === type.toUpperCase() ? 'red' : 'black', char: type };
  }
  return b;
}

function assertLegal(b, { from, to }) {
  const moves = getValidMoves(b, from[0], from[1]);
  assert.ok(
    moves.some(([r, c]) => r === to[0] && c === to[1]),
    `engine move ${from}→${to} must be legal`,
  );
}

test('returns a legal move from the start position', () => {
  const { board: b } = createInitialState();
  const result = findBestMove(b, 'black', { timeMs: 200 });
  assert.ok(result.bestMove, 'engine returns a move');
  assert.ok(result.depth >= 1, 'completes at least depth 1');
  assert.ok(result.pv.length >= 1, 'reports a principal variation');
  assertLegal(b, result.bestMove);
});

test('captures a hanging rook', () => {
  const b = board({ '0,4': 'k', '9,5': 'K', '5,0': 'r', '5,8': 'R' });
  const result = findBestMove(b, 'black', { timeMs: 500 });
  assert.deepEqual(result.bestMove, { from: [5, 0], to: [5, 8] });
});

test('finds a forced win in one move', () => {
  const b = board({ '0,4': 'k', '9,3': 'K', '8,0': 'r', '8,8': 'r' });
  const result = findBestMove(b, 'black', { timeMs: 1000 });
  assert.ok(result.score >= 99000, `expects a mate score, got ${result.score}`);
  const g = makeMove(
    { ...createInitialState(), board: b, currentTurn: 'black' },
    ...result.bestMove.from, ...result.bestMove.to,
  );
  // Checkmate and stalemate are both wins for the mover in Xiangqi.
  assert.ok(['checkmate', 'stalemate'].includes(g.status), `got status ${g.status}`);
  assert.equal(g.winner, 'black');
});

test('resolves check with the best defence', () => {
  // Black is in check from the red rook; capturing it with the black rook
  // both escapes check and wins material.
  const b = board({ '0,4': 'k', '9,5': 'K', '2,4': 'R', '2,0': 'r' });
  const result = findBestMove(b, 'black', { timeMs: 500 });
  assertLegal(b, result.bestMove);
  assert.deepEqual(result.bestMove, { from: [2, 0], to: [2, 4] });
});
