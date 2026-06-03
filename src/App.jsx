import { useState, useCallback } from 'react';
import Board from './components/Board';
import StrategyPanel from './components/StrategyPanel';
import { createInitialState } from './logic/gameState';
import { getValidMoves, applyMove, isInCheckState, isCheckmate } from './logic/moves';
import './App.css';

function toNotation(piece, fromRow, fromCol, toRow, toCol) {
  const cols = 'abcdefghi';
  return `${piece.char}${cols[fromCol]}${fromRow}→${cols[toCol]}${toRow}`;
}

export default function App() {
  const [game, setGame] = useState(createInitialState);

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

  return (
    <div className="app">
      <header className="header">
        <div className="header-text">
          <h1>象棋</h1>
          <span className="subtitle">Xiangqi · Learn Chinese Chess</span>
        </div>
        <button className="btn-reset" onClick={() => setGame(createInitialState())}>
          New Game
        </button>
      </header>

      {game.status === 'checkmate' && (
        <div className="banner checkmate">
          Checkmate — {game.currentTurn === 'red' ? 'Black' : 'Red'} wins!
        </div>
      )}

      <main className="main">
        <Board gameState={game} onSelect={handleSelect} onMove={handleMove} />
        <StrategyPanel gameState={game} />
      </main>
    </div>
  );
}
