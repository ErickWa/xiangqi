import { useState, useCallback, useEffect, useRef } from 'react';
import Board from './components/Board';
import StrategyPanel from './components/StrategyPanel';
import { createInitialState } from './logic/gameState';
import { getValidMoves, makeMove, isGameOver, toNotation } from './logic/moves';
import { explainAiMove, explainPlayerMove, assessPlayerMove, BLUNDER_THRESHOLD } from './coach/coach';
import { recognizeOpenings } from './coach/openings';
import './App.css';

const notate = (board, { from, to }) => {
  const piece = board[`${from[0]},${from[1]}`];
  return piece ? toNotation(piece, from[0], from[1], to[0], to[1]) : null;
};

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
  const [coachLog, setCoachLog] = useState([]);
  const lastAiResult = useRef(null); // previous search: {score, pv, board after AI's move}
  const history = useRef([]);        // pre-move snapshots, one per move played
  const logId = useRef(0);
  const gameOver = isGameOver(game);
  const aiThinking = aiEnabled && game.currentTurn === 'black' && !gameOver;

  // Lock input while a moved piece is gliding (matches the 300ms transition).
  const [inFlight, setInFlight] = useState(false);
  useEffect(() => {
    if (!inFlight) return;
    const t = setTimeout(() => setInFlight(false), 320);
    return () => clearTimeout(t);
  }, [inFlight]);

  // Newest entry is the only one that may offer a takeback.
  const pushCoach = useCallback((text, takeback = false) => setCoachLog(log => [
    ...log.map(e => ({ ...e, takeback: false })),
    { id: ++logId.current, text, takeback },
  ]), []);

  // Announce each recognized opening once per game.
  const announcedOpenings = useRef(new Set());
  const announceOpenings = useCallback((moveHistory) => {
    for (const o of recognizeOpenings(moveHistory)) {
      if (announcedOpenings.current.has(o.name)) continue;
      announcedOpenings.current.add(o.name);
      pushCoach(`Opening: ${o.name} — ${o.idea}.`);
    }
  }, [pushCoach]);

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
    if (!game.selected) return;
    const [fromRow, fromCol] = game.selected;
    const piece = game.board[`${fromRow},${fromCol}`];
    const next = makeMove(game, fromRow, fromCol, toRow, toCol);
    history.current.push(game);
    setInFlight(true);
    // A declined takeback offer expires once the player moves on; after this
    // move the history top no longer matches the entry that offered it.
    setCoachLog(log => log.some(e => e.takeback)
      ? log.map(e => ({ ...e, takeback: false }))
      : log);
    if (aiEnabled) {
      const check = next.status === 'check' || next.status === 'checkmate';
      pushCoach(explainPlayerMove({
        moveText: notate(game.board, { from: [fromRow, fromCol], to: [toRow, toCol] }),
        pieceChar: piece.char,
        capturedChar: game.board[`${toRow},${toCol}`]?.char ?? null,
        check,
        escapedCheck: game.status === 'check' && !check,
        crossedRiver: piece.color === 'red' && fromRow >= 5 && toRow <= 4,
      }));
      announceOpenings(next.moveHistory);
    }
    setGame(next);
  }, [game, aiEnabled, pushCoach, announceOpenings]);

  useEffect(() => {
    if (!aiThinking) return;

    const worker = new Worker(new URL('./engine/worker.js', import.meta.url), { type: 'module' });
    const started = Date.now();
    let beat; // ensures the reply lands after the player's piece settles
    worker.onmessage = ({ data }) => {
      if (!data.bestMove) {
        setAiEnabled(false);
        setAiError(data.error || 'Engine found no move');
        return;
      }
      beat = setTimeout(() => applyAiMove(data), Math.max(0, 450 - (Date.now() - started)));
    };

    function applyAiMove(data) {
      const { from, to } = data.bestMove;

      // Judge the player's last move against what the previous search
      // expected: if the engine's outlook improved sharply, it was a blunder.
      const prev = lastAiResult.current;
      if (prev) {
        const note = assessPlayerMove({
          delta: data.score - prev.score,
          betterText: prev.pv[1] && notate(prev.board, prev.pv[1]),
        });
        if (note) pushCoach(note, data.score - prev.score >= BLUNDER_THRESHOLD);
      }

      const capturedChar = game.board[`${to[0]},${to[1]}`]?.char ?? null;
      const next = makeMove(game, from[0], from[1], to[0], to[1]);
      const plan = data.pv[2];
      const planPiece = plan && next.board[`${plan.from[0]},${plan.from[1]}`];
      pushCoach(explainAiMove({
        moveText: notate(game.board, data.bestMove),
        capturedChar,
        check: next.status === 'check' || next.status === 'checkmate',
        score: data.score,
        planText: planPiece?.color === 'black' ? notate(next.board, plan) : null,
      }));
      lastAiResult.current = { score: data.score, pv: data.pv, board: next.board };
      announceOpenings(next.moveHistory);
      history.current.push(game);
      setInFlight(true);
      setGame(next);
    }

    worker.onerror = (err) => {
      console.error('Engine error:', err);
      setAiEnabled(false);
      setAiError(err.message || 'Engine failed');
    };
    worker.postMessage({
      position: { board: game.board, turn: 'black' },
      limits: AI_LEVELS[aiLevel].limits,
    });

    return () => { worker.terminate(); clearTimeout(beat); };
  }, [aiThinking, game, aiLevel, pushCoach, announceOpenings]);

  function resetGame() {
    setAiError(null);
    setCoachLog([]);
    lastAiResult.current = null;
    history.current = [];
    announcedOpenings.current = new Set();
    setGame(createInitialState());
  }

  // Rewind to the player's previous turn: one step normally, two when the
  // AI has already replied (vs AI the player must land back on their turn).
  function rewind() {
    const h = history.current;
    if (h.length === 0) return;
    let target = h.pop();
    if (aiEnabled) while (target.currentTurn !== 'red' && h.length > 0) target = h.pop();
    lastAiResult.current = null; // previous search no longer matches the position
    setCoachLog(log => log.some(e => e.takeback)
      ? log.map(e => ({ ...e, takeback: false }))
      : log);
    setInFlight(true); // pieces glide back
    setGame(target);
  }

  // Revert both the player's blundered move and the AI's reply.
  function takeBack(entryId) {
    if (history.current.length === 0) return;
    rewind();
    setCoachLog(log => log.map(e =>
      e.id === entryId ? { ...e, takeback: false, text: `${e.text} (taken back)` } : e,
    ));
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
          <button
            className="btn-reset"
            onClick={rewind}
            disabled={game.moveHistory.length === 0}
            title="Rewind to your previous turn"
          >
            ↩ Back
          </button>
          <button className="btn-reset" onClick={resetGame}>
            New Game
          </button>
        </div>
      </header>

      {/* Fixed-height strip so banners never shift the board. */}
      <div className="status-strip">
        {gameOver ? (
          <div className="banner checkmate">
            {game.status === 'draw'
              ? 'Draw by repetition'
              : `${{ checkmate: 'Checkmate', stalemate: 'Stalemate', perpetual: 'Perpetual check' }[game.status]} — ${game.winner === 'red' ? 'Red' : 'Black'} wins!`}
          </div>
        ) : aiError ? (
          <div className="banner checkmate">AI opponent stopped: {aiError}</div>
        ) : aiThinking ? (
          <div className="banner ai-thinking">黑方 is thinking…</div>
        ) : null}
      </div>

      <main className="main">
        <Board
          gameState={game}
          onSelect={handleSelect}
          onMove={handleMove}
          disabled={gameOver || inFlight || (aiEnabled && game.currentTurn === 'black')}
        />
        <StrategyPanel gameState={game} coachLog={coachLog} onTakeback={takeBack} />
      </main>
    </div>
  );
}
