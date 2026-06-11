import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recognizeOpenings } from './openings.js';

test('recognizes the central cannon from the first move', () => {
  const found = recognizeOpenings(['炮b7→e7']);
  assert.equal(found.length, 1);
  assert.match(found[0].name, /Central Cannon/);
});

test('recognizes screen horses once both black horses develop', () => {
  const oneHorse = recognizeOpenings(['炮b7→e7', '馬b0→c2', '馬b9→c7']);
  assert.ok(!oneHorse.some(o => o.name.includes('Screen Horses')));
  const both = recognizeOpenings(['炮b7→e7', '馬b0→c2', '馬b9→c7', '馬h0→g2']);
  assert.ok(both.some(o => o.name.includes('Screen Horses')));
});

test('moves outside the opening window are not recognized', () => {
  // Central cannon on red's 3rd move is past the 2-ply window.
  const found = recognizeOpenings([
    '兵c6→c5', '卒c3→c4', '馬b9→c7', '馬b0→c2', '炮b7→e7',
  ]);
  assert.ok(!found.some(o => o.name === '中炮 Central Cannon'));
});

test('black and red central cannons are distinguished', () => {
  const found = recognizeOpenings(['炮b7→e7', '砲h2→e2']);
  const names = found.map(o => o.name);
  assert.ok(names.includes('中炮 Central Cannon'));
  assert.ok(names.includes('中炮 Central Cannon (Black)'));
});

test('a quiet opening matches nothing', () => {
  assert.equal(recognizeOpenings(['兵e6→e5']).length, 0);
});
