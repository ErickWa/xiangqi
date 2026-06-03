export const RED = 'red';
export const BLACK = 'black';

// Uppercase = Red pieces, lowercase = Black pieces
// K/k=General, A/a=Advisor, E/e=Elephant, H/h=Horse, R/r=Rook, C/c=Cannon, P/p=Soldier
const PIECE_CHARS = {
  K: '帅', A: '仕', E: '相', H: '馬', R: '車', C: '炮', P: '兵',
  k: '将', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒',
};

// Row 0 = Black's back rank (top), Row 9 = Red's back rank (bottom)
const INITIAL_LAYOUT = [
  ['r','h','e','a','k','a','e','h','r'],
  [ null,null,null,null,null,null,null,null,null],
  [ null,'c', null,null,null,null,null,'c', null],
  ['p', null,'p', null,'p', null,'p', null,'p'],
  [ null,null,null,null,null,null,null,null,null],
  [ null,null,null,null,null,null,null,null,null],
  ['P', null,'P', null,'P', null,'P', null,'P'],
  [ null,'C', null,null,null,null,null,'C', null],
  [ null,null,null,null,null,null,null,null,null],
  ['R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R'],
];

export function createInitialState() {
  const board = {};
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const type = INITIAL_LAYOUT[row][col];
      if (type) {
        board[`${row},${col}`] = {
          type,
          color: type === type.toUpperCase() ? RED : BLACK,
          char: PIECE_CHARS[type],
        };
      }
    }
  }
  return {
    board,
    currentTurn: RED,
    moveHistory: [],
    selected: null,
    validMoves: [],
    status: 'playing',
  };
}

export function boardToArray(board) {
  const arr = Array.from({ length: 10 }, () => Array(9).fill(null));
  for (const [key, piece] of Object.entries(board)) {
    const [row, col] = key.split(',').map(Number);
    arr[row][col] = piece;
  }
  return arr;
}

export function boardToAscii(board) {
  const arr = boardToArray(board);
  const lines = ['   0 1 2 3 4 5 6 7 8'];
  for (let row = 0; row < 10; row++) {
    let line = `${row}  `;
    for (let col = 0; col < 9; col++) {
      const piece = arr[row][col];
      line += piece ? piece.char : '·';
      if (col < 8) line += ' ';
    }
    if (row === 4) line += '  ← River (楚河)';
    if (row === 5) line += '  ← River (漢界)';
    lines.push(line);
  }
  return lines.join('\n');
}
