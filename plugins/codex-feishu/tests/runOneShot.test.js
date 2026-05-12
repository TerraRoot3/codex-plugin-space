import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runOneShot } from '../src/daemon/runOneShot.js';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-oneshot-'));
}

test('runOneShot processes a text payload and returns reply output', async () => {
  const tempDir = createTempDir();
  const replies = [];

  try {
    const result = await runOneShot({
      payload: {
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
            content: JSON.stringify({ text: 'hello codex' }),
          },
        },
      },
      settings: {
        appId: 'cli_settings',
        appSecret: 'secret_settings',
        dataDir: tempDir,
        workspaceDir: '/tmp/workspace-run-one-shot',
      },
      codexRunner: {
        async runTextTurn() {
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

    assert.deepEqual(replies, [
      {
        chatId: 'oc_001',
        text: 'hello from codex',
        replyToMessageId: 'om_001',
      },
    ]);
    assert.equal(result.threadId, 'thread_001');
    assert.equal(result.config.appId, 'cli_settings');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('runOneShot builds the default Codex runner with an isolated CODEX_HOME', async () => {
  const tempDir = createTempDir();
  const runnerCalls = [];

  try {
    await runOneShot({
      payload: {
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
            content: JSON.stringify({ text: 'hello codex' }),
          },
        },
      },
      settings: {
        appId: 'cli_settings',
        appSecret: 'secret_settings',
        dataDir: tempDir,
        workspaceDir: '/tmp/workspace-run-one-shot',
      },
      codexRunnerFactory(options) {
        runnerCalls.push(options);
        return {
          async runTextTurn() {
            return {
              threadId: 'thread_002',
              replyText: 'reply from default runner',
            };
          },
        };
      },
      replyClient: {
        async sendText() {},
      },
    });

    assert.equal(runnerCalls.length, 1);
    assert.equal(runnerCalls[0].codexHome, path.join(tempDir, 'codex-home'));
    assert.equal(runnerCalls[0].cwd, '/tmp/workspace-run-one-shot');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
