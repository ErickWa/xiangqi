import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainAiMove, assessPlayerMove, pieceName, BLUNDER_THRESHOLD } from './coach.js';

test('explains a capture with check', () => {
  const text = explainAiMove({
    moveText: '車a0→a9', capturedChar: '馬', check: true, score: 250, planText: null,
  });
  assert.match(text, /captured your horse with 車a0→a9/);
  assert.match(text, /Check!/);
});

test('quiet move falls back to a stance on the position', () => {
  const text = explainAiMove({
    moveText: '炮b7→e7', capturedChar: null, check: false, score: 0, planText: null,
  });
  assert.match(text, /I played 炮b7→e7/);
  assert.match(text, /balanced/);
});

test('plan from the PV replaces the stance', () => {
  const text = explainAiMove({
    moveText: '炮b7→e7', capturedChar: null, check: false, score: 0, planText: '車a0→a4',
  });
  assert.match(text, /preparing 車a0→a4/);
  assert.doesNotMatch(text, /balanced/);
});

test('small eval swings produce no comment', () => {
  assert.equal(assessPlayerMove({ delta: BLUNDER_THRESHOLD - 1, betterText: '兵e6→e5' }), null);
  assert.equal(assessPlayerMove({ delta: 0, betterText: null }), null);
});

test('a blunder names the better move', () => {
  const text = assessPlayerMove({ delta: 200, betterText: '兵e6→e5' });
  assert.match(text, /Stronger was 兵e6→e5/);
});

test('a large blunder mentions material', () => {
  assert.match(assessPlayerMove({ delta: 450, betterText: null }), /loses material/);
});

test('a strong player move earns praise', () => {
  assert.match(assessPlayerMove({ delta: -200, betterText: null }), /Good move/);
});

test('unknown piece chars degrade gracefully', () => {
  assert.equal(pieceName('?'), 'piece');
});
