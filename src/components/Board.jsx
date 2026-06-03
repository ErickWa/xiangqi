import { useCallback } from 'react';
import Piece from './Piece';

const CELL = 64;
const PAD  = 48;
const W = 8 * CELL + 2 * PAD;
const H = 9 * CELL + 2 * PAD;

const x = col => PAD + col * CELL;
const y = row => PAD + row * CELL;

function BoardLines() {
  const lines = [];

  for (let row = 0; row <= 9; row++) {
    lines.push(<line key={`h${row}`} x1={x(0)} y1={y(row)} x2={x(8)} y2={y(row)} stroke="#7a4010" strokeWidth="1" />);
  }

  for (let col = 0; col <= 8; col++) {
    if (col === 0 || col === 8) {
      lines.push(<line key={`v${col}`} x1={x(col)} y1={y(0)} x2={x(col)} y2={y(9)} stroke="#7a4010" strokeWidth="1" />);
    } else {
      lines.push(
        <line key={`vt${col}`} x1={x(col)} y1={y(0)} x2={x(col)} y2={y(4)} stroke="#7a4010" strokeWidth="1" />,
        <line key={`vb${col}`} x1={x(col)} y1={y(5)} x2={x(col)} y2={y(9)} stroke="#7a4010" strokeWidth="1" />,
      );
    }
  }

  // Palace diagonals
  const palaces = [
    [x(3),y(7),x(5),y(9)], [x(5),y(7),x(3),y(9)],
    [x(3),y(0),x(5),y(2)], [x(5),y(0),x(3),y(2)],
  ];
  palaces.forEach(([x1,y1,x2,y2], i) => (
    lines.push(<line key={`pd${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7a4010" strokeWidth="1" />)
  ));

  return <>{lines}</>;
}

export default function Board({ gameState, onSelect, onMove }) {
  const { board, selected, validMoves, currentTurn } = gameState;

  const handleClick = useCallback((row, col) => {
    const piece = board[`${row},${col}`];
    if (selected) {
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        onMove(row, col);
      } else if (piece?.color === currentTurn) {
        onSelect(row, col);
      } else {
        onSelect(null);
      }
    } else {
      if (piece?.color === currentTurn) onSelect(row, col);
    }
  }, [board, selected, validMoves, currentTurn, onSelect, onMove]);

  return (
    <svg
      width={W}
      height={H}
      style={{ background: '#f0c67a', borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}
    >
      <BoardLines />

      {/* River labels */}
      <text x={W / 2 - 80} y={y(4) + CELL / 2} textAnchor="middle" dominantBaseline="middle"
        fill="#7a4010" fontSize="17" fontFamily="serif" letterSpacing="20">楚河</text>
      <text x={W / 2 + 80} y={y(4) + CELL / 2} textAnchor="middle" dominantBaseline="middle"
        fill="#7a4010" fontSize="17" fontFamily="serif" letterSpacing="20">漢界</text>

      {/* Valid-move dots (rendered under pieces) */}
      {validMoves.map(([row, col]) => (
        <circle
          key={`vm${row},${col}`}
          cx={x(col)} cy={y(row)} r={10}
          fill="rgba(0,160,255,0.35)"
          stroke="rgba(0,160,255,0.8)"
          strokeWidth="2"
          onClick={() => onMove(row, col)}
          style={{ cursor: 'pointer' }}
        />
      ))}

      {/* Pieces */}
      {Object.entries(board).map(([key, piece]) => {
        const [row, col] = key.split(',').map(Number);
        return (
          <Piece
            key={key}
            piece={piece}
            x={x(col)}
            y={y(row)}
            isSelected={!!(selected && selected[0] === row && selected[1] === col)}
            onClick={() => handleClick(row, col)}
          />
        );
      })}
    </svg>
  );
}
