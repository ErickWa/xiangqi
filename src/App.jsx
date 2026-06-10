import { useState, useCallback, useEffect } from 'react';
import Board from './components/Board';
import StrategyPanel from './components/StrategyPanel';
import { createInitialState, boardToAscii } from './logic/gameState';
import { getValidMoves, applyMove, isInCheckState, isCheckmate } from './logic/moves';
import './App.css';

function toNotation(piece, fromRow, fromCol, toRow, toCol) {
  const cols = 'abcdefghi';
  return `${piece.char}${cols[fromCol]}${fromRow}→${cols[toCol]}${toRow}`;
}

function getAllValidMoves(board, color) {
  const moves = [];
  for (const [key, piece] of Object.entries(board)) {
    if (piece.color !== color) continue;
    const [row, col] = key.split(',').map(Number);
    for (const [toRow, toCol] of getValidMoves(board, row, col)) {
      moves.push({ char: piece.char, from: [row, col], to: [toRow, toCol] });
    }
  }
  return moves;
}

export default function App() {
  const [game, setGame] = useState(createInitialState);
  const [aiEnabled, setAiEnabled] = useState(false);
  const aiThinking = aiEnabled && game.currentTurn === 'black' && game.status === 'playing';

  const handleSelect = useCallback((row, col) => {
    if (row === null) {
      setGame(g => ({ ...g, selected: null, validMoves: [] }));
      return;
    }
    setGame(g => ({
      ...g,
      selected: [row, col],
      validMoves: getValidMoves(g.board, row, col),
    }));
  }, []);

  const handleMove = useCallback((toRow, toCol) => {
    setGame(g => {
      if (!g.selected) return g;
      const [fromRow, fromCol] = g.selected;
      const piece = g.board[`${fromRow},${fromCol}`];
      if (!piece) return g;

      const newBoard = applyMove(g.board, fromRow, fromCol, toRow, toCol);
      const nextTurn = g.currentTurn === 'red' ? 'black' : 'red';
      const notation = toNotation(piece, fromRow, fromCol, toRow, toCol);
      const inCheck = isInCheckState(newBoard, nextTurn);
      const mated   = inCheck && isCheckmate(newBoard, nextTurn);

      return {
        ...g,
        board: newBoard,
        currentTurn: nextTurn,
        selected: null,
        validMoves: [],
        moveHistory: [...g.moveHistory, notation],
        status: mated ? 'checkmate' : inCheck ? 'check' : 'playing',
      };
    });
  }, []);

  const handleAiMove = useCallback((fromRow, fromCol, toRow, toCol) => {
    setGame(g => {
      const piece = g.board[`${fromRow},${fromCol}`];
      if (!piece) return g;
      const newBoard = applyMove(g.board, fromRow, fromCol, toRow, toCol);
      const notation = toNotation(piece, fromRow, fromCol, toRow, toCol);
      const inCheck = isInCheckState(newBoard, 'red');
      const mated   = inCheck && isCheckmate(newBoard, 'red');
      return {
        ...g,
        board: newBoard,
        currentTurn: 'red',
        selected: null,
        validMoves: [],
        moveHistory: [...g.moveHistory, notation],
        status: mated ? 'checkmate' : inCheck ? 'check' : 'playing',
      };
    });
  }, []);

  useEffect(() => {
    if (!aiEnabled || game.currentTurn !== 'black' || game.status !== 'playing') return;

    const moves = getAllValidMoves(game.board, 'black');
    if (moves.length === 0) return;

    let cancelled = false;

    fetch('/api/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: boardToAscii(game.board),
        moveHistory: game.moveHistory,
        validMoves: moves,
      }),
    })
      .then(r => r.json())
      .then(({ from, to, error }) => {
        if (cancelled) return;
        if (error || !from || !to) {
          console.error('AI move error:', error);
          setAiEnabled(false);
          return;
        }
        handleAiMove(from[0], from[1], to[0], to[1]);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('AI move failed:', err);
          setAiEnabled(false);
        }
      });

    return () => { cancelled = true; };
  }, [aiEnabled, game.currentTurn, game.status, game.board, game.moveHistory, handleAiMove]);

  function resetGame() {
    setGame(createInitialState());
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-text">
          <h1>象棋</h1>
          <span className="subtitle">Xiangqi · Learn Chinese Chess</span>
        </div>
        <div className="header-actions">
          <button
            className={`btn-ai-toggle ${aiEnabled ? 'active' : ''}`}
            onClick={() => setAiEnabled(e => !e)}
          >
            AI opponent: {aiEnabled ? 'On' : 'Off'}
          </button>
          <button className="btn-reset" onClick={resetGame}>
            New Game
          </button>
        </div>
      </header>

      {game.status === 'checkmate' && (
        <div className="banner checkmate">
          Checkmate — {game.currentTurn === 'red' ? 'Black' : 'Red'} wins!
        </div>
      )}

      {aiThinking && (
        <div className="banner ai-thinking">
          黑方 is thinking…
        </div>
      )}

      <main className="main">
        <Board
          gameState={game}
          onSelect={handleSelect}
          onMove={handleMove}
          disabled={aiEnabled && game.currentTurn === 'black'}
        />
        <StrategyPanel gameState={game} />
      </main>
    </div>
  );
}
