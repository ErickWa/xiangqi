import { useState, useCallback, useEffect } from 'react';
import Board from './components/Board';
import StrategyPanel from './components/StrategyPanel';
import { createInitialState, boardToAscii } from './logic/gameState';
import { getValidMoves, makeMove, isGameOver } from './logic/moves';
import './App.css';

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
  const [aiRetry, setAiRetry] = useState(0);
  const gameOver = isGameOver(game);
  const aiThinking = aiEnabled && game.currentTurn === 'black' && !gameOver;

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
    setGame(g => g.selected ? makeMove(g, g.selected[0], g.selected[1], toRow, toCol) : g);
  }, []);

  const handleAiMove = useCallback((fromRow, fromCol, toRow, toCol) => {
    setGame(g => makeMove(g, fromRow, fromCol, toRow, toCol));
  }, []);

  useEffect(() => {
    if (!aiEnabled || game.currentTurn !== 'black' || gameOver) return;

    const moves = getAllValidMoves(game.board, 'black');
    if (moves.length === 0) return;

    let cancelled = false;
    let timer;

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
        if (error || !from || !to) throw new Error(error || 'Bad AI response');
        setAiRetry(0);
        handleAiMove(from[0], from[1], to[0], to[1]);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('AI move failed:', err);
        // Low-tier API keys allow ~5 requests/min; wait out the rate-limit
        // window and retry before giving up on the AI.
        if (aiRetry < 3) timer = setTimeout(() => setAiRetry(r => r + 1), 15000);
        else setAiEnabled(false);
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, [aiEnabled, game.currentTurn, gameOver, game.board, game.moveHistory, handleAiMove, aiRetry]);

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

      {gameOver && (
        <div className="banner checkmate">
          {game.status === 'draw'
            ? 'Draw by repetition'
            : `${{ checkmate: 'Checkmate', stalemate: 'Stalemate', perpetual: 'Perpetual check' }[game.status]} — ${game.winner === 'red' ? 'Red' : 'Black'} wins!`}
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
          disabled={gameOver || (aiEnabled && game.currentTurn === 'black')}
        />
        <StrategyPanel gameState={game} />
      </main>
    </div>
  );
}
