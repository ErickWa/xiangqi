import { useState, useRef, useEffect } from 'react';
import { boardToAscii } from '../logic/gameState';

export default function StrategyPanel({ gameState, coachLog = [], onTakeback }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const boxRef = useRef(null);
  const feedRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [analysis]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [coachLog]);

  async function analyze() {
    if (loading) return;
    setLoading(true);
    setAnalysis('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: boardToAscii(gameState.board),
          moveHistory: gameState.moveHistory,
          currentTurn: gameState.currentTurn,
          question: question.trim() || null,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text } = JSON.parse(payload);
            if (text) setAnalysis(prev => prev + text);
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      setAnalysis(`Error: ${err.message}\n\nMake sure ANTHROPIC_API_KEY is set in your .dev.vars file.`);
    } finally {
      setLoading(false);
    }
  }

  const isRed = gameState.currentTurn === 'red';

  return (
    <div className="panel">
      <h2 className="panel-title">Strategy Coach</h2>

      <div className="turn-row">
        <span className={`turn-badge ${isRed ? 'red' : 'black'}`}>
          {isRed ? '红方 Red' : '黑方 Black'}&apos;s Turn
        </span>
        {gameState.status === 'check' && <span className="check-label">Check!</span>}
      </div>

      {coachLog.length > 0 && (
        <div className="coach-feed" ref={feedRef}>
          {coachLog.map(entry => (
            <p key={entry.id} className="coach-entry">
              {entry.text}
              {entry.takeback && (
                <button className="takeback-btn" onClick={() => onTakeback(entry.id)}>
                  Take back
                </button>
              )}
            </p>
          ))}
        </div>
      )}

      <div className="analysis-box" ref={boxRef}>
        {analysis || (
          <p className="placeholder">
            Click &ldquo;Analyze&rdquo; to get strategic advice from the AI coach.
            You can also ask a specific question below.
          </p>
        )}
        {loading && <span className="cursor">▍</span>}
      </div>

      <div className="input-row">
        <input
          className="question-input"
          type="text"
          placeholder="Ask a question (optional)…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          disabled={loading}
        />
        <button className="analyze-btn" onClick={analyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {gameState.moveHistory.length > 0 && (
        <div className="history">
          <h3 className="history-title">Move History</h3>
          <div className="move-list">
            {gameState.moveHistory.map((move, i) => (
              <span key={i} className={`move-chip ${i % 2 === 0 ? 'red' : 'black'}`}>
                {move}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
