// Small opening book: named patterns recognized from early move notation
// (e.g. 炮b7→e7). Pure data + matching — no chess computed here.

const BOOK = [
  {
    name: '中炮 Central Cannon',
    side: 'red', plies: 2,
    moves: [/^炮[bh]7→e7$/],
    idea: 'the cannon takes aim at the soldier shielding my general — direct, attacking play',
  },
  {
    name: '飞相局 Flying Elephant',
    side: 'red', plies: 1,
    moves: [/^相[cg]9→e7$/],
    idea: 'a solid, flexible setup that strengthens the center before committing to a plan',
  },
  {
    name: '仙人指路 Pawn Opening ("Immortal Points the Way")',
    side: 'red', plies: 1,
    moves: [/^兵[cg]6→[cg]5$/],
    idea: 'a probing soldier push that opens a path for the horse while hiding intentions',
  },
  {
    name: '起马局 Horse Opening',
    side: 'red', plies: 1,
    moves: [/^馬[bh]9→[cg]7$/],
    idea: 'develops a horse toward the center first, keeping every plan available',
  },
  {
    name: '屏风马 Screen Horses',
    side: 'black', plies: 4,
    moves: [/^馬b0→c2$/, /^馬h0→g2$/],
    idea: 'my horses shield the central soldier side by side — a resilient defense against the central cannon',
  },
  {
    name: '中炮 Central Cannon (Black)',
    side: 'black', plies: 2,
    moves: [/^砲[bh]2→e2$/],
    idea: 'I answer in kind — both cannons stare down the center, promising sharp tactics',
  },
];

// Returns every book entry whose moves all appear within that side's first
// `plies` moves of the game. Callers de-duplicate announcements.
export function recognizeOpenings(moveHistory) {
  const found = [];
  for (const entry of BOOK) {
    const offset = entry.side === 'red' ? 0 : 1;
    const sideMoves = moveHistory
      .filter((_, i) => i % 2 === offset)
      .slice(0, entry.plies);
    if (entry.moves.every(re => sideMoves.some(m => re.test(m)))) found.push(entry);
  }
  return found;
}
