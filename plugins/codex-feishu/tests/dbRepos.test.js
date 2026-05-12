import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { openDb } from '../src/db/openDb.js';
import {
  getBindingByChatId,
  upsertBinding,
} from '../src/db/bindingsRepo.js';

function createTempDbPath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-db-'));
  return {
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
    dbPath: path.join(tempDir, 'state.sqlite'),
  };
}

test('upsertBinding stores and returns the active binding', () => {
  const temp = createTempDbPath();

  try {
    const db = openDb(temp.dbPath);

    upsertBinding(db, {
      chatId: 'oc_text_demo',
      threadId: 'thread_001',
      mode: 'background',
      replyToFeishu: true,
    });

    const binding = getBindingByChatId(db, 'oc_text_demo');

    assert.deepEqual(binding, {
      chatId: 'oc_text_demo',
      threadId: 'thread_001',
      mode: 'background',
      replyToFeishu: true,
    });
  } finally {
    temp.cleanup();
  }
});

test('upsertBinding replaces the thread for an existing chat binding', () => {
  const temp = createTempDbPath();

  try {
    const db = openDb(temp.dbPath);

    upsertBinding(db, {
      chatId: 'oc_text_demo',
      threadId: 'thread_001',
      mode: 'background',
      replyToFeishu: true,
    });
    upsertBinding(db, {
      chatId: 'oc_text_demo',
      threadId: 'thread_002',
      mode: 'background',
      replyToFeishu: true,
    });

    const binding = getBindingByChatId(db, 'oc_text_demo');

    assert.equal(binding.threadId, 'thread_002');
  } finally {
    temp.cleanup();
  }
});
