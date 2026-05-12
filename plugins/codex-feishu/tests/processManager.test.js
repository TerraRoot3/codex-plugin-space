import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  readDaemonStatus,
  startDaemon,
  stopDaemon,
} from '../src/daemon/processManager.js';

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-daemon-'));
}

test('startDaemon writes pid state and stopDaemon clears it', async () => {
  const tempHome = createTempHome();
  const spawned = [];
  const signals = [];
  let running = true;

  try {
    const started = await startDaemon({
      settings: {
        appId: 'cli_app_id',
        appSecret: 'secret_demo',
      },
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
      spawnChild(command, args, options) {
        spawned.push({ command, args, options });
        return {
          pid: 43210,
          unref() {},
        };
      },
      isProcessRunning(pid) {
        assert.equal(pid, 43210);
        return running;
      },
    });

    assert.equal(started.status.running, true);
    assert.equal(started.status.pid, 43210);
    assert.equal(spawned.length, 1);

    const statusAfterStart = await readDaemonStatus({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
      isProcessRunning(pid) {
        assert.equal(pid, 43210);
        return running;
      },
    });
    assert.equal(statusAfterStart.running, true);
    assert.equal(statusAfterStart.pid, 43210);

    running = false;
    const stopped = await stopDaemon({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
      killProcess(pid, signal) {
        signals.push({ pid, signal });
      },
    });

    assert.equal(stopped.stopped, true);
    assert.deepEqual(signals, [
      {
        pid: 43210,
        signal: 'SIGTERM',
      },
    ]);

    const statusAfterStop = await readDaemonStatus({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
      isProcessRunning() {
        return false;
      },
    });
    assert.equal(statusAfterStop.running, false);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});
