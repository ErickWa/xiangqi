import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from './gameState.js';
import {
  getValidMoves, isInCheckState, hasNoLegalMoves, makeMove, isGameOver,
} from './moves.js';

// Sparse board builder: pieces is { 'row,col': type }. Uppercase = red.
function board(pieces) {
  const b = {};
  for (const [key, type] of Object.entries(pieces)) {
    b[key] = { type, color: type === type.toUpperCase() ? 'red' : 'black', char: type };
  }
  return b;
}

function state(b, turn) {
  return {
    board: b, currentTurn: turn, moveHistory: [], selected: null,
    validMoves: [], status: 'playing', winner: null, positionLog: [],
  };
}

function countMoves(b, color) {
  let n = 0;
  for (const [key, piece] of Object.entries(b)) {
    if (piece.color !== color) continue;
    const [r, c] = key.split(',').map(Number);
    n += getValidMoves(b, r, c).length;
  }
  return n;
}

test('start position has 44 legal moves for each side', () => {
  const { board: b } = createInitialState();
  assert.equal(countMoves(b, 'red'), 44);
  assert.equal(countMoves(b, 'black'), 44);
});

test('cannon captures only over exactly one screen', () => {
  const { board: b } = createInitialState();
  const moves = getValidMoves(b, 7, 1); // red cannon
  const has = (r, c) => moves.some(([mr, mc]) => mr === r && mc === c);
  assert.ok(has(0, 1), 'captures horse over the screen');
  assert.ok(!has(2, 1), 'cannot capture the screen itself');
  assert.ok(!has(1, 1), 'cannot land beyond screen without capture');
});

test('flying general: screening piece cannot expose the file', () => {
  const b = board({ '0,4': 'k', '9,4': 'K', '5,4': 'R' });
  const moves = getValidMoves(b, 5, 4);
  assert.ok(moves.every(([, c]) => c === 4), 'rook may only move along the file');
});

test('check detection: rook attacks the general', () => {
  const b = board({ '0,4': 'k', '9,3': 'K', '0,0': 'R' });
  assert.ok(isInCheckState(b, 'black'));
  assert.ok(!isInCheckState(b, 'red'));
});

test('checkmate: makeMove resolves status and winner', () => {
  const b = board({ '0,4': 'k', '9,3': 'K', '1,8': 'R', '5,0': 'R' });
  const g = makeMove(state(b, 'red'), 5, 0, 0, 0);
  assert.equal(g.status, 'checkmate');
  assert.equal(g.winner, 'red');
  assert.ok(isGameOver(g));
  assert.strictEqual(makeMove(g, 0, 4, 1, 4), g, 'moves after game over are no-ops');
});

test('stalemate: no legal moves while not in check', () => {
  const b = board({ '0,4': 'k', '9,3': 'K', '1,3': 'P', '1,5': 'P' });
  assert.ok(!isInCheckState(b, 'black'));
  assert.ok(hasNoLegalMoves(b, 'black'));
});

test('threefold repetition without checks is a draw', () => {
  let g = createInitialState();
  g = makeMove(g, 6, 0, 5, 0);
  g = makeMove(g, 3, 0, 4, 0);
  for (let i = 0; i < 4 && !isGameOver(g); i++) {
    g = makeMove(g, 9, 1, 7, 2); g = makeMove(g, 0, 1, 2, 2);
    g = makeMove(g, 7, 2, 9, 1); g = makeMove(g, 2, 2, 0, 1);
  }
  assert.equal(g.status, 'draw');
  assert.equal(g.winner, null);
});

test('perpetual check loses for the checking side', () => {
  const b = board({ '0,4': 'k', '9,5': 'K', '5,4': 'R' });
  let g = state(b, 'black'); // black starts in check from the rook
  g.positionLog = [{ key: 'seed', mover: null, gaveCheck: false }];
  for (let i = 0; i < 8 && !isGameOver(g); i++) {
    const from = 4 - (i % 2), to = 3 + (i % 2);
    g = makeMove(g, 0, from, 0, to); // general shuttles between cols 4 and 3
    g = makeMove(g, 5, from, 5, to); // rook chases on the same file, checking
  }
  assert.equal(g.status, 'perpetual');
  assert.equal(g.winner, 'black', 'the perpetually checking side (red) loses');
});

test('soldier gains sideways moves only after crossing the river', () => {
  const before = board({ '6,4': 'P', '9,4': 'K', '0,4': 'k' });
  assert.equal(getValidMoves(before, 6, 4).length, 1);
  const after = board({ '4,4': 'P', '9,3': 'K', '0,4': 'k' });
  assert.equal(getValidMoves(after, 4, 4).length, 3);
});
