import { RED, BLACK, boardToArray, positionKey } from './gameState.js';

function inBounds(row, col) {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8;
}

function inPalace(row, col, color) {
  const inCols = col >= 3 && col <= 5;
  return color === RED
    ? inCols && row >= 7 && row <= 9
    : inCols && row >= 0 && row <= 2;
}

function crossedRiver(row, color) {
  return color === RED ? row <= 4 : row >= 5;
}

function rookMoves(arr, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    let r = row + dr, c = col + dc;
    while (inBounds(r, c)) {
      if (arr[r][c]) {
        if (arr[r][c].color !== color) moves.push([r, c]);
        break;
      }
      moves.push([r, c]);
      r += dr; c += dc;
    }
  }
  return moves;
}

function horseMoves(arr, row, col, color) {
  const moves = [];
  // Each entry: [leg offset, final destination offset] (relative to origin)
  const patterns = [
    [[-1,0],[-2,-1]], [[-1,0],[-2,1]],
    [[1,0],[2,-1]],  [[1,0],[2,1]],
    [[0,-1],[-1,-2]],[[0,-1],[1,-2]],
    [[0,1],[-1,2]],  [[0,1],[1,2]],
  ];
  for (const [[lr,lc],[fr,fc]] of patterns) {
    const legR = row + lr, legC = col + lc;
    if (!inBounds(legR, legC) || arr[legR][legC]) continue;
    const finalR = row + fr, finalC = col + fc;
    if (!inBounds(finalR, finalC)) continue;
    if (!arr[finalR][finalC] || arr[finalR][finalC].color !== color) {
      moves.push([finalR, finalC]);
    }
  }
  return moves;
}

function elephantMoves(arr, row, col, color) {
  const moves = [];
  const targets = [[-2,-2],[-2,2],[2,-2],[2,2]];
  const elbows = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (let i = 0; i < 4; i++) {
    const [dr, dc] = targets[i];
    const [er, ec] = elbows[i];
    const toR = row + dr, toC = col + dc;
    if (!inBounds(toR, toC)) continue;
    if (color === RED && toR < 5) continue;
    if (color === BLACK && toR > 4) continue;
    if (arr[row + er][col + ec]) continue;
    if (!arr[toR][toC] || arr[toR][toC].color !== color) {
      moves.push([toR, toC]);
    }
  }
  return moves;
}

function advisorMoves(arr, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    const toR = row + dr, toC = col + dc;
    if (!inPalace(toR, toC, color)) continue;
    if (!arr[toR][toC] || arr[toR][toC].color !== color) {
      moves.push([toR, toC]);
    }
  }
  return moves;
}

function generalMoves(arr, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const toR = row + dr, toC = col + dc;
    if (!inPalace(toR, toC, color)) continue;
    if (!arr[toR][toC] || arr[toR][toC].color !== color) {
      moves.push([toR, toC]);
    }
  }
  return moves;
}

function cannonMoves(arr, row, col, color) {
  const moves = [];
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    let r = row + dr, c = col + dc;
    let jumped = false;
    while (inBounds(r, c)) {
      if (!jumped) {
        if (arr[r][c]) { jumped = true; }
        else { moves.push([r, c]); }
      } else {
        if (arr[r][c]) {
          if (arr[r][c].color !== color) moves.push([r, c]);
          break;
        }
      }
      r += dr; c += dc;
    }
  }
  return moves;
}

function soldierMoves(arr, row, col, color) {
  const moves = [];
  const fwd = color === RED ? -1 : 1;
  const toR = row + fwd;
  if (inBounds(toR, col) && (!arr[toR][col] || arr[toR][col].color !== color)) {
    moves.push([toR, col]);
  }
  if (crossedRiver(row, color)) {
    for (const dc of [-1, 1]) {
      const toC = col + dc;
      if (inBounds(row, toC) && (!arr[row][toC] || arr[row][toC].color !== color)) {
        moves.push([row, toC]);
      }
    }
  }
  return moves;
}

function rawMoves(arr, row, col) {
  const piece = arr[row][col];
  if (!piece) return [];
  const { color } = piece;
  switch (piece.type.toUpperCase()) {
    case 'R': return rookMoves(arr, row, col, color);
    case 'H': return horseMoves(arr, row, col, color);
    case 'E': return elephantMoves(arr, row, col, color);
    case 'A': return advisorMoves(arr, row, col, color);
    case 'K': return generalMoves(arr, row, col, color);
    case 'C': return cannonMoves(arr, row, col, color);
    case 'P': return soldierMoves(arr, row, col, color);
    default:  return [];
  }
}

function findGeneral(arr, color) {
  const type = color === RED ? 'K' : 'k';
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 9; c++)
      if (arr[r][c]?.type === type) return [r, c];
  return null;
}

function generalsAreFacing(arr) {
  let redPos = null, blackPos = null;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (arr[r][c]?.type === 'K') redPos = [r, c];
      if (arr[r][c]?.type === 'k') blackPos = [r, c];
    }
  }
  if (!redPos || !blackPos || redPos[1] !== blackPos[1]) return false;
  const col = redPos[1];
  const minRow = Math.min(redPos[0], blackPos[0]);
  const maxRow = Math.max(redPos[0], blackPos[0]);
  for (let r = minRow + 1; r < maxRow; r++) {
    if (arr[r][col]) return false;
  }
  return true;
}

export function applyMove(board, fromRow, fromCol, toRow, toCol) {
  const next = { ...board };
  const piece = next[`${fromRow},${fromCol}`];
  delete next[`${fromRow},${fromCol}`];
  next[`${toRow},${toCol}`] = piece;
  return next;
}

export function isInCheckState(board, color) {
  const arr = boardToArray(board);
  if (generalsAreFacing(arr)) return true;
  const pos = findGeneral(arr, color);
  if (!pos) return false;
  const [gr, gc] = pos;
  const opp = color === RED ? BLACK : RED;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (arr[r][c]?.color !== opp) continue;
      if (rawMoves(arr, r, c).some(([mr, mc]) => mr === gr && mc === gc)) return true;
    }
  }
  return false;
}

export function getValidMoves(board, fromRow, fromCol) {
  const piece = board[`${fromRow},${fromCol}`];
  if (!piece) return [];
  const arr = boardToArray(board);
  const candidates = rawMoves(arr, fromRow, fromCol);
  return candidates.filter(([toR, toC]) => {
    const next = applyMove(board, fromRow, fromCol, toR, toC);
    return !isInCheckState(next, piece.color);
  });
}

export function hasNoLegalMoves(board, color) {
  for (const [key, piece] of Object.entries(board)) {
    if (piece.color !== color) continue;
    const [row, col] = key.split(',').map(Number);
    if (getValidMoves(board, row, col).length > 0) return false;
  }
  return true;
}

// log: one {key, mover, gaveCheck} entry per position reached. When the
// latest position has occurred 3 times: if one side gave check with every
// move inside the repeating cycle, that side loses (perpetual check);
// otherwise it's a draw. Returns null, 'draw', or the losing color.
export function repetitionLoser(log) {
  const last = log[log.length - 1];
  const occurrences = [];
  for (let i = 0; i < log.length; i++) {
    if (log[i].key === last.key) occurrences.push(i);
  }
  if (occurrences.length < 3) return null;
  const cycle = log.slice(occurrences[occurrences.length - 3] + 1);
  for (const color of [RED, BLACK]) {
    const entries = cycle.filter(e => e.mover === color);
    if (entries.length > 0 && entries.every(e => e.gaveCheck)) return color;
  }
  return 'draw';
}

export function toNotation(piece, fromRow, fromCol, toRow, toCol) {
  const cols = 'abcdefghi';
  return `${piece.char}${cols[fromCol]}${fromRow}→${cols[toCol]}${toRow}`;
}

const OVER_STATUSES = new Set(['checkmate', 'stalemate', 'perpetual', 'draw']);

export function isGameOver(state) {
  return OVER_STATUSES.has(state.status);
}

// Pure reducer: applies a move and resolves the resulting game status
// (check, checkmate, stalemate — a loss in Xiangqi — repetition draw, or
// perpetual-check loss). Returns the next game state.
export function makeMove(state, fromRow, fromCol, toRow, toCol) {
  if (isGameOver(state)) return state;
  const piece = state.board[`${fromRow},${fromCol}`];
  if (!piece) return state;

  const board = applyMove(state.board, fromRow, fromCol, toRow, toCol);
  const mover = piece.color;
  const nextTurn = mover === RED ? BLACK : RED;
  const gaveCheck = isInCheckState(board, nextTurn);
  const positionLog = [
    ...state.positionLog,
    { key: positionKey(board, nextTurn), mover, gaveCheck },
  ];

  let status = gaveCheck ? 'check' : 'playing';
  let winner = null;
  const repetition = repetitionLoser(positionLog);
  if (repetition === 'draw') {
    status = 'draw';
  } else if (repetition) {
    status = 'perpetual';
    winner = repetition === RED ? BLACK : RED;
  } else if (hasNoLegalMoves(board, nextTurn)) {
    status = gaveCheck ? 'checkmate' : 'stalemate';
    winner = mover;
  }

  return {
    ...state,
    board,
    currentTurn: nextTurn,
    selected: null,
    validMoves: [],
    lastMove: { from: [fromRow, fromCol], to: [toRow, toCol] },
    moveHistory: [...state.moveHistory, toNotation(piece, fromRow, fromCol, toRow, toCol)],
    positionLog,
    status,
    winner,
  };
}
