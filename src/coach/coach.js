// Offline coach: turns engine search facts into short human explanations.
// Pure templates — all chess knowledge arrives as engine output (score,
// PV, captures); this module never computes chess itself.

const NAMES = {
  帅: 'general', 将: 'general',
  仕: 'advisor', 士: 'advisor',
  相: 'elephant', 象: 'elephant',
  馬: 'horse', 車: 'chariot',
  炮: 'cannon', 砲: 'cannon',
  兵: 'soldier', 卒: 'soldier',
};

export const BLUNDER_THRESHOLD = 150;

export function pieceName(char) {
  return NAMES[char] || 'piece';
}

// Engine scores are centipawns from the engine's (Black's) perspective.
function stance(score) {
  if (score >= 400) return "I'm winning material — watch your defences.";
  if (score >= 150) return 'I like my position here.';
  if (score > -150) return 'The game is balanced.';
  if (score > -400) return "You're slightly ahead — well played.";
  return "You're winning — finish me off!";
}

// 1–2 sentences on what the engine's move did and what it intends.
export function explainAiMove({ moveText, capturedChar, check, score, planText }) {
  const parts = [];
  parts.push(capturedChar
    ? `I captured your ${pieceName(capturedChar)} with ${moveText}.`
    : `I played ${moveText}.`);
  if (check) parts.push('Check!');
  if (planText) parts.push(`I'm preparing ${planText}.`);
  else parts.push(stance(score));
  return parts.join(' ');
}

// Narrates the player's move so the feed reads as a running account of the
// game. All facts are logic-state observations passed in by the caller.
export function explainPlayerMove({ moveText, pieceChar, capturedChar, check, escapedCheck, crossedRiver }) {
  const parts = [];
  parts.push(capturedChar
    ? `You captured my ${pieceName(capturedChar)} with ${moveText}.`
    : `You played ${moveText}.`);
  if (check) parts.push('My general is in check!');
  else if (escapedCheck) parts.push('That answers my threat.');
  else if (crossedRiver) parts.push(`Your ${pieceName(pieceChar)} crosses the river into my half.`);
  return parts.join(' ');
}

// delta: how much the engine's outlook improved after the player's move,
// relative to the reply it expected. Positive = the player did worse than
// expected; strongly negative = the player outplayed the expectation.
export function assessPlayerMove({ delta, betterText }) {
  if (delta >= BLUNDER_THRESHOLD) {
    const opener = delta >= 400
      ? 'That move loses material.'
      : 'That move gives me a chance.';
    return betterText ? `${opener} Stronger was ${betterText}.` : opener;
  }
  if (delta <= -BLUNDER_THRESHOLD) return 'Good move — that limits my options.';
  return null;
}
