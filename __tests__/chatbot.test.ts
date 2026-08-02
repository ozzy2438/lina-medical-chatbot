import test from 'node:test';
import assert from 'node:assert/strict';
import { getReply } from '../lib/chatbot.ts';

test('recognizes a cut intent', () => {
  const reply = getReply('I cut my finger while cooking');
  assert.equal(reply.intent, 'cuts');
  assert.match(reply.message, /small cut/i);
});

test('recognizes a nosebleed intent', () => {
  const reply = getReply('My child has a bloody nose');
  assert.equal(reply.intent, 'nosebleed');
  assert.match(reply.message, /lean slightly forward/i);
});

test('emergency language overrides regular intent selection', () => {
  const reply = getReply('I burned my hand and cannot breathe');
  assert.equal(reply.intent, 'urgent');
  assert.equal(reply.urgent, true);
});

test('uses friendly fallback for unsupported questions', () => {
  const reply = getReply('Can you fix my broken laptop?');
  assert.equal(reply.intent, 'fallback');
  assert.match(reply.message, /not quite sure/i);
});
