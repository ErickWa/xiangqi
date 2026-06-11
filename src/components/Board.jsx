import { useCallback, useEffect, useRef, useState } from 'react';
import Piece from './Piece';

const CELL = 64;
// Wide enough that edge pieces (disc + selection/last-move rings, ~33px)
// never reach the axis labels at the outer rim.
const PAD  = 56;
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

// Axis labels matching move notation (columns a–i, rows 0–9, row 0 at top).
function AxisLabels() {
  const labels = [];
  const cols = 'abcdefghi';
  for (let col = 0; col < 9; col++) {
    labels.push(
      <text key={`c${col}`} x={x(col)} y={H - 12} textAnchor="middle"
        fill="#7a4010" fontSize="13" fontFamily="monospace" opacity="0.7">{cols[col]}</text>,
    );
  }
  for (let row = 0; row < 10; row++) {
    labels.push(
      <text key={`r${row}`} x={14} y={y(row)} textAnchor="middle" dominantBaseline="central"
        fill="#7a4010" fontSize="13" fontFamily="monospace" opacity="0.7">{row}</text>,
    );
  }
  return <>{labels}</>;
}

export default function Board({ gameState, onSelect, onMove, disabled = false }) {
  const { board, selected, validMoves, currentTurn, lastMove, status } = gameState;

  // When exactly one piece vanished since the last render, it was captured:
  // keep it on the board briefly so it can fade out under the capturer.
  // (Takeback and New Game change 0 or many pieces and are skipped.)
  const [fading, setFading] = useState(null);
  const prevBoard = useRef(board);
  useEffect(() => {
    const prev = prevBoard.current;
    prevBoard.current = board;
    if (prev === board) return;
    const ids = new Set(Object.values(board).map(p => p.id));
    const gone = Object.entries(prev).filter(([, p]) => !ids.has(p.id));
    if (gone.length !== 1) return;
    const [key, piece] = gone[0];
    const [row, col] = key.split(',').map(Number);
    setFading({ piece, row, col });
    const t = setTimeout(() => setFading(null), 400);
    return () => clearTimeout(t);
  }, [board]);

  // General under threat gets a pulsing ring.
  let checkPos = null;
  if (status === 'check' || status === 'checkmate') {
    const type = currentTurn === 'red' ? 'K' : 'k';
    const entry = Object.entries(board).find(([, p]) => p.type === type);
    if (entry) checkPos = entry[0].split(',').map(Number);
  }

  const handleClick = useCallback((row, col) => {
    if (disabled) return;
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
  }, [board, selected, validMoves, currentTurn, onSelect, onMove, disabled]);

  return (
    <svg
      width={W}
      height={H}
      style={{ background: '#f0c67a', borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,0.5)' }}
    >
      <BoardLines />
      <AxisLabels />

      {/* River labels */}
      <text x={W / 2 - 80} y={y(4) + CELL / 2} textAnchor="middle" dominantBaseline="middle"
        fill="#7a4010" fontSize="17" fontFamily="serif" letterSpacing="20">楚河</text>
      <text x={W / 2 + 80} y={y(4) + CELL / 2} textAnchor="middle" dominantBaseline="middle"
        fill="#7a4010" fontSize="17" fontFamily="serif" letterSpacing="20">漢界</text>

      {/* Last move stays marked until the next move (origin dot, destination ring) */}
      {lastMove && (
        <>
          <circle cx={x(lastMove.from[1])} cy={y(lastMove.from[0])} r={8}
            fill="rgba(255,170,0,0.45)" stroke="rgba(255,170,0,0.8)" strokeWidth="2" />
          <circle cx={x(lastMove.to[1])} cy={y(lastMove.to[0])} r={31}
            fill="none" stroke="rgba(255,170,0,0.8)" strokeWidth="3" />
        </>
      )}

      {/* Check cue on the threatened general */}
      {checkPos && (
        <circle className="check-pulse" cx={x(checkPos[1])} cy={y(checkPos[0])} r={31}
          fill="none" stroke="#FF3333" strokeWidth="4" />
      )}

      {/* Valid-move dots (rendered under pieces) */}
      {validMoves.map(([row, col]) => (
        <circle
          key={`vm${row},${col}`}
          cx={x(col)} cy={y(row)} r={10}
          fill="rgba(0,160,255,0.35)"
          stroke="rgba(0,160,255,0.8)"
          strokeWidth="2"
          onClick={() => !disabled && onMove(row, col)}
          style={{ cursor: 'pointer' }}
        />
      ))}

      {/* Captured piece fades out under the capturer */}
      {fading && (
        <Piece
          piece={fading.piece}
          x={x(fading.col)}
          y={y(fading.row)}
          className="piece-fading"
        />
      )}

      {/* Pieces — keyed by piece id so moves glide instead of remounting */}
      {Object.entries(board).map(([key, piece]) => {
        const [row, col] = key.split(',').map(Number);
        return (
          <Piece
            key={piece.id ?? key}
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
