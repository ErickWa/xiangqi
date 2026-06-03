import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a Xiangqi (Chinese Chess / 象棋) engine playing as Black (top side, 黑方).
You will be given a board position and a numbered list of all legal moves available to you.
Choose the strongest move — consider captures, tactical threats, piece coordination, and king safety.
You must call the select_move tool with the index of your chosen move.`;

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
  ].join('\n');

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      tools: [
        {
          name: 'select_move',
          description: 'Select the move to play by its index in the legal moves list.',
          input_schema: {
            type: 'object',
            properties: {
              move_index: {
                type: 'integer',
                description: 'Zero-based index of the chosen move.',
              },
            },
            required: ['move_index'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'select_move' },
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) throw new Error('No move selected.');

    const { move_index } = toolUse.input;
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
