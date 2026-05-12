import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { startLongConnection } from '../src/daemon/startLongConnection.js';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-long-'));
}

test('startLongConnection wires transport to orchestrator and replies through transport', async () => {
  const tempDir = createTempDir();
  const sentReplies = [];
  let injectedHandler = null;
  let started = false;

  try {
    const { transport } = await startLongConnection({
      settings: {
        appId: 'cli_demo',
        appSecret: 'secret_demo',
        dataDir: tempDir,
      },
      codexRunner: {
        async runTextTurn(input) {
          return {
            threadId: input.threadId ?? 'thread_001',
            replyText: `echo: ${input.text}`,
          };
        },
      },
      channelTransportFactory(options) {
        injectedHandler = options.onTextMessage;

        return {
          async start() {
            started = true;
          },
          async sendText(reply) {
            sentReplies.push(reply);
          },
          async disconnect() {},
        };
      },
    });

    assert.equal(started, true);
    assert.equal(typeof injectedHandler, 'function');

    await injectedHandler({
      messageId: 'om_001',
      chatId: 'oc_001',
      senderOpenId: 'ou_demo',
      text: 'hello codex',
    });

    assert.equal(typeof transport.disconnect, 'function');
    assert.deepEqual(sentReplies, [
      {
        chatId: 'oc_001',
        text: 'echo: hello codex',
        replyToMessageId: 'om_001',
      },
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('startLongConnection builds the default Codex runner with an isolated CODEX_HOME', async () => {
  const tempDir = createTempDir();
  const runnerCalls = [];

  try {
    await startLongConnection({
      settings: {
        appId: 'cli_demo',
        appSecret: 'secret_demo',
        dataDir: tempDir,
      },
      codexRunnerFactory(options) {
        runnerCalls.push(options);
        return {
          async runTextTurn(input) {
            return {
              threadId: input.threadId ?? 'thread_003',
              replyText: `echo: ${input.text}`,
            };
          },
        };
      },
      channelTransportFactory() {
        return {
          async start() {},
          async sendText() {},
          async disconnect() {},
        };
      },
    });

    assert.equal(runnerCalls.length, 1);
    assert.equal(runnerCalls[0].codexHome, path.join(tempDir, 'codex-home'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
