import Anthropic from '@anthropic-ai/sdk';
import { MODEL } from './_model.js';

const SYSTEM_PROMPT = `You are a Xiangqi (Chinese Chess / 象棋) engine playing as Black (top side, 黑方).
You will be given a board position and a numbered list of all legal moves available to you.
Choose the strongest move — consider captures, tactical threats, piece coordination, and king safety.
Respond with ONLY a JSON object on a single line, e.g.: {"move_index":5}
Do not include any other text.`;

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { board, moveHistory = [], validMoves = [] } = body;

  if (validMoves.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid moves available.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  }

  const moveList = validMoves
    .map((m, i) => `${i}: ${m.char} (${m.from[0]},${m.from[1]}) → (${m.to[0]},${m.to[1]})`)
    .join('\n');

  const userMessage = [
    'Current board position:',
    board,
    '',
    moveHistory.length > 0 ? `Move history: ${moveHistory.join(' → ')}` : 'Opening — no moves yet.',
    '',
    'Your legal moves (as Black):',
    moveList,
    '',
    'Reply with ONLY a JSON object, e.g.: {"move_index":5}',
  ].join('\n');

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 64,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    const match = text.match(/"move_index"\s*:\s*(\d+)/);
    if (!match) throw new Error(`Could not parse move index from: ${text}`);

    const move_index = parseInt(match[1], 10);
    const chosen = validMoves[move_index];
    if (!chosen) throw new Error(`Invalid move index: ${move_index}`);

    return new Response(
      JSON.stringify({ from: chosen.from, to: chosen.to }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  }
}

export function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
