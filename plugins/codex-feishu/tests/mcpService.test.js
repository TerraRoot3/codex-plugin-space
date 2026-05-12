import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { openDb } from '../src/db/openDb.js';
import { upsertBinding } from '../src/db/bindingsRepo.js';
import { createMcpService } from '../src/mcp/service.js';

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-mcp-'));
}

test('mcp service configures bridge state and reports status', async () => {
  const tempHome = createTempHome();

  try {
    const service = createMcpService({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
      startDaemonImpl: async () => ({
        alreadyRunning: false,
        status: {
          running: true,
          pid: 43210,
        },
      }),
      readDaemonStatusImpl: async () => ({
        running: false,
        pid: null,
      }),
    });

    const configured = await service.configureBridge({
      appId: 'cli_app_id',
      appSecret: 'secret_demo',
      mode: 'background',
      workspaceDir: '/tmp/workspace-demo',
    });

    assert.equal(configured.configured, true);
    assert.equal(configured.config.appId, 'cli_app_id');
    assert.equal(configured.config.hasSecret, true);
    assert.equal(configured.config.workspaceDir, '/tmp/workspace-demo');

    const started = await service.startBridge();
    assert.equal(started.daemon.running, true);
    assert.equal(started.daemon.pid, 43210);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test('mcp service lists bindings and saved codex sessions', async () => {
  const tempHome = createTempHome();
  const dataDir = path.join(tempHome, 'data');

  try {
    const db = openDb(path.join(dataDir, 'state.sqlite'));
    upsertBinding(db, {
      chatId: 'oc_001',
      threadId: 'thread_001',
    });

    const service = createMcpService({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
      listSavedSessionsImpl: async () => [
        {
          threadId: 'thread_001',
          threadName: 'demo session',
          updatedAt: '2026-05-12T10:00:00.000Z',
        },
      ],
    });

    await service.configureBridge({
      appId: 'cli_app_id',
      appSecret: 'secret_demo',
      dataDir,
    });

    const bindings = await service.listBindings();
    const sessions = await service.listSavedCodexSessions();

    assert.deepEqual(bindings, [
      {
        chatId: 'oc_001',
        threadId: 'thread_001',
        mode: 'background',
        replyToFeishu: true,
      },
    ]);
    assert.deepEqual(sessions, [
      {
        threadId: 'thread_001',
        threadName: 'demo session',
        updatedAt: '2026-05-12T10:00:00.000Z',
      },
    ]);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});
