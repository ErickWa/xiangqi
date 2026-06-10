import Anthropic from '@anthropic-ai/sdk';
import { MODEL } from './_model.js';

// Long system prompt — cached so repeated analysis calls are fast and cheap
const SYSTEM_PROMPT = `You are an expert Xiangqi (Chinese Chess / 象棋) coach. Your role is to analyze board positions and give clear, educational strategic advice to help students learn.

## Board Format
The board is 9 columns (0–8) × 10 rows (0–9).
Row 0 = Black's back rank (top). Row 9 = Red's back rank (bottom).
The river runs between rows 4 and 5.
Empty squares are shown as ·

## Pieces
Red (bottom): 帅=General, 仕=Advisor, 相=Elephant, 馬=Horse, 車=Rook, 炮=Cannon, 兵=Soldier
Black (top):  将=General, 士=Advisor, 象=Elephant, 馬=Horse, 車=Rook, 砲=Cannon, 卒=Soldier

## Movement Rules
- **General (帅/将)**: One step orthogonally, stays within palace (cols 3–5, rows 7–9 for Red / rows 0–2 for Black). The two Generals may never face each other on the same file with no pieces between them ("flying general" rule).
- **Advisor (仕/士)**: One step diagonally, stays within palace.
- **Elephant (相/象)**: Exactly two diagonal steps; cannot cross the river; blocked if the midpoint ("elbow") is occupied.
- **Horse (馬)**: One orthogonal then one diagonal step; the orthogonal step can be blocked ("leg block").
- **Rook (車)**: Any number of squares horizontally or vertically; cannot jump pieces.
- **Cannon (炮/砲)**: Moves like a Rook, but to CAPTURE must jump over exactly one intervening piece (the "screen").
- **Soldier (兵/卒)**: One step forward. After crossing the river, may also move one step sideways. Cannot retreat.

## Key Strategic Concepts
1. **Opening**: Develop Rooks to open files, advance center Cannons, support Horses.
2. **Cannon battery**: Two Cannons in line amplify threats.
3. **Rook-Horse coordination**: Rook opens the file, Horse forks or mates.
4. **Leg block**: Blocking a Horse's orthogonal step neutralises it.
5. **General safety**: Keep the General protected; watch for "flying general" threats.
6. **Passed Soldiers**: Advanced Soldiers near the enemy palace are powerful in the endgame.
7. **Cannon mates**: A Cannon backed by a screen piece can deliver back-rank mate.

## Response Style
- Be educational: explain the *why* behind each suggestion.
- Reference positions by row/column (e.g., "the Rook at row 9, col 0").
- Give 2–3 concrete candidate moves with brief explanations.
- Highlight any immediate threats or tactics for either side.
- Keep the tone encouraging and accessible to students.`;

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { board, moveHistory = [], currentTurn, question } = body;

  const defaultQuestion = `What are the best 2–3 moves for ${currentTurn === 'red' ? 'Red (bottom)' : 'Black (top)'} right now, and why?`;

  const userMessage = [
    `Current board position:`,
    board,
    ``,
    `Current turn: ${currentTurn === 'red' ? 'Red (bottom, 红方)' : 'Black (top, 黑方)'}`,
    moveHistory.length > 0
      ? `Move history: ${moveHistory.join(' → ')}`
      : `Opening position — no moves yet.`,
    ``,
    question || defaultQuestion,
  ].join('\n');

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: userMessage }],
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const errChunk = `data: ${JSON.stringify({ text: `\n\n[Error: ${err.message}]` })}\n\n`;
        controller.enqueue(encoder.encode(errChunk));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
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
