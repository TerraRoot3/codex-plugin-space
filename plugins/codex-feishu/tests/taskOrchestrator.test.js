import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { openDb } from '../src/db/openDb.js';
import { getBindingByChatId } from '../src/db/bindingsRepo.js';
import { createTaskOrchestrator } from '../src/daemon/taskOrchestrator.js';

function createTempDbPath() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-orch-'));
  return {
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
    dbPath: path.join(tempDir, 'state.sqlite'),
  };
}

function createTextPayload(text) {
  return {
    schema: '2.0',
    header: {
      event_type: 'im.message.receive_v1',
    },
    event: {
      sender: {
        sender_id: {
          open_id: 'ou_demo',
        },
      },
      message: {
        message_id: 'om_001',
        chat_id: 'oc_001',
        message_type: 'text',
        content: JSON.stringify({ text }),
      },
    },
  };
}

test('text message without binding creates a session, stores it, and replies', async () => {
  const temp = createTempDbPath();
  const replies = [];
  const runnerCalls = [];

  try {
    const db = openDb(temp.dbPath);
    const orchestrator = createTaskOrchestrator({
      db,
      codexRunner: {
        async runTextTurn(input) {
          runnerCalls.push(input);
          return {
            threadId: 'thread_001',
            replyText: 'hello from codex',
          };
        },
      },
      replyClient: {
        async sendText(reply) {
          replies.push(reply);
        },
      },
    });

    await orchestrator.handleIncomingPayload(createTextPayload('hello codex'));

    assert.deepEqual(runnerCalls, [
      {
        chatId: 'oc_001',
        threadId: null,
        text: 'hello codex',
      },
    ]);
    assert.deepEqual(replies, [
      {
        chatId: 'oc_001',
        text: 'hello from codex',
        replyToMessageId: 'om_001',
      },
    ]);
    assert.deepEqual(getBindingByChatId(db, 'oc_001'), {
      chatId: 'oc_001',
      threadId: 'thread_001',
      mode: 'background',
      replyToFeishu: true,
    });
  } finally {
    temp.cleanup();
  }
});

test('text message with existing binding reuses the current thread', async () => {
  const temp = createTempDbPath();
  const runnerCalls = [];

  try {
    const db = openDb(temp.dbPath);
    const orchestrator = createTaskOrchestrator({
      db,
      codexRunner: {
        async runTextTurn(input) {
          runnerCalls.push(input);
          return {
            threadId: input.threadId ?? 'thread_001',
            replyText: 'continued reply',
          };
        },
      },
      replyClient: {
        async sendText() {},
      },
    });

    await orchestrator.handleIncomingPayload(createTextPayload('hello codex'));
    await orchestrator.handleIncomingPayload(createTextPayload('follow up'));

    assert.deepEqual(runnerCalls, [
      {
        chatId: 'oc_001',
        threadId: null,
        text: 'hello codex',
      },
      {
        chatId: 'oc_001',
        threadId: 'thread_001',
        text: 'follow up',
      },
    ]);
  } finally {
    temp.cleanup();
  }
});

test('/new command replaces the binding with a fresh thread', async () => {
  const temp = createTempDbPath();
  const replies = [];

  try {
    const db = openDb(temp.dbPath);
    let nextId = 2;
    const orchestrator = createTaskOrchestrator({
      db,
      codexRunner: {
        async createThread() {
          const threadId = `thread_00${nextId}`;
          nextId += 1;
          return { threadId };
        },
        async runTextTurn(input) {
          return {
            threadId: input.threadId ?? 'thread_001',
            replyText: 'reply',
          };
        },
      },
      replyClient: {
        async sendText(reply) {
          replies.push(reply);
        },
      },
    });

    await orchestrator.handleIncomingPayload(createTextPayload('hello codex'));
    await orchestrator.handleIncomingPayload(createTextPayload('/new'));

    assert.deepEqual(getBindingByChatId(db, 'oc_001'), {
      chatId: 'oc_001',
      threadId: 'thread_002',
      mode: 'background',
      replyToFeishu: true,
    });
    assert.deepEqual(replies.at(-1), {
      chatId: 'oc_001',
      text: 'Started a new Codex session: thread_002',
      replyToMessageId: 'om_001',
    });
  } finally {
    temp.cleanup();
  }
});
