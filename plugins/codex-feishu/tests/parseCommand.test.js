import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCommand } from '../src/commands/parseCommand.js';

test('parseCommand recognizes slash commands and arguments', () => {
  assert.deepEqual(parseCommand('/new'), {
    name: 'new',
    args: [],
  });

  assert.deepEqual(parseCommand('/bind thread_001'), {
    name: 'bind',
    args: ['thread_001'],
  });
});

test('parseCommand ignores normal text messages', () => {
  assert.equal(parseCommand('hello codex'), null);
});
