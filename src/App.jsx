import { useState, useCallback, useEffect } from 'react';
import Board from './components/Board';
import StrategyPanel from './components/StrategyPanel';
import { createInitialState } from './logic/gameState';
import { getValidMoves, makeMove, isGameOver } from './logic/moves';
import './App.css';

// Strength comes from search depth/time only — lower levels are shallower,
// never random.
const AI_LEVELS = [
  { label: '初级 Casual', limits: { maxDepth: 2, timeMs: 250 } },
  { label: '中级 Club', limits: { maxDepth: 4, timeMs: 700 } },
  { label: '高级 Master', limits: { maxDepth: 64, timeMs: 1500 } },
];

export default function App() {
  const [game, setGame] = useState(createInitialState);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLevel, setAiLevel] = useState(1);
  const [aiError, setAiError] = useState(null);
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
    if (!aiThinking) return;

    const worker = new Worker(new URL('./engine/worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (!data.bestMove) {
        setAiEnabled(false);
        setAiError(data.error || 'Engine found no move');
        return;
      }
      const { from, to } = data.bestMove;
      handleAiMove(from[0], from[1], to[0], to[1]);
    };
    worker.onerror = (err) => {
      console.error('Engine error:', err);
      setAiEnabled(false);
      setAiError(err.message || 'Engine failed');
    };
    worker.postMessage({
      position: { board: game.board, turn: 'black' },
      limits: AI_LEVELS[aiLevel].limits,
    });

    return () => worker.terminate();
  }, [aiThinking, game.board, aiLevel, handleAiMove]);

  function resetGame() {
    setAiError(null);
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
          <select
            className="ai-level"
            value={aiLevel}
            onChange={e => setAiLevel(Number(e.target.value))}
            aria-label="AI strength"
          >
            {AI_LEVELS.map((lvl, i) => (
              <option key={lvl.label} value={i}>{lvl.label}</option>
            ))}
          </select>
          <button
            className={`btn-ai-toggle ${aiEnabled ? 'active' : ''}`}
            onClick={() => { setAiError(null); setAiEnabled(e => !e); }}
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

      {aiError && (
        <div className="banner checkmate">
          AI opponent stopped: {aiError}
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
