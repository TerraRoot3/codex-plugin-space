import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  readStoredConfig,
  writeStoredConfig,
} from '../src/config/configStore.js';
import {
  readFileSecret,
  writeFileSecret,
} from '../src/config/fileSecretStore.js';

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-config-'));
}

test('stored config persists non-secret settings', async () => {
  const tempHome = createTempHome();

  try {
    await writeStoredConfig({
      config: {
        appId: 'cli_app_id',
        appSecret: 'should_not_be_written',
        mode: 'background',
        dataDir: '/tmp/codex-feishu-data',
      },
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });

    const stored = await readStoredConfig({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });

    assert.deepEqual(stored, {
      appId: 'cli_app_id',
      mode: 'background',
      dataDir: '/tmp/codex-feishu-data',
    });
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test('file secret store persists the feishu app secret', async () => {
  const tempHome = createTempHome();

  try {
    await writeFileSecret('secret_demo', {
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });

    const secret = await readFileSecret({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });

    assert.equal(secret, 'secret_demo');
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});
