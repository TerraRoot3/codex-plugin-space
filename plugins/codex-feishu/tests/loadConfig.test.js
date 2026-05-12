import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  ConfigError,
  loadConfig,
} from '../src/config/loadConfig.js';
import {
  writeStoredConfig,
} from '../src/config/configStore.js';
import {
  writeFileSecret,
} from '../src/config/fileSecretStore.js';

function createTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codex-feishu-load-'));
}

test('loadConfig prefers settings over environment variables', async () => {
  const config = await loadConfig({
    settings: {
      appId: 'cli_settings',
      appSecret: 'secret_settings',
      mode: 'current',
      dataDir: '/tmp/from-settings',
    },
    env: {
      FEISHU_APP_ID: 'cli_env',
      FEISHU_APP_SECRET: 'secret_env',
      CODEX_FEISHU_MODE: 'background',
      CODEX_FEISHU_DATA_DIR: '/tmp/from-env',
    },
  });

  assert.deepEqual(config, {
    appId: 'cli_settings',
    appSecret: 'secret_settings',
    mode: 'current',
    dataDir: '/tmp/from-settings',
    configHome: path.join(os.homedir(), '.codex-feishu'),
  });
});

test('loadConfig falls back to environment variables', async () => {
  const tempHome = createTempHome();

  try {
  const config = await loadConfig({
    settings: {},
    env: {
      FEISHU_APP_ID: 'cli_env',
      FEISHU_APP_SECRET: 'secret_env',
      CODEX_FEISHU_MODE: 'background',
      CODEX_FEISHU_DATA_DIR: '/tmp/from-env',
      CODEX_FEISHU_HOME: tempHome,
    },
  });

  assert.deepEqual(config, {
    appId: 'cli_env',
    appSecret: 'secret_env',
    mode: 'background',
    dataDir: '/tmp/from-env',
    configHome: tempHome,
  });
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test('loadConfig falls back to stored config and secret file', async () => {
  const tempHome = createTempHome();

  try {
    await writeStoredConfig({
      config: {
        appId: 'stored_app',
        mode: 'current',
        dataDir: '/tmp/from-store',
      },
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });
    await writeFileSecret('stored_secret', {
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });

    const config = await loadConfig({
      env: {
        CODEX_FEISHU_HOME: tempHome,
      },
    });

    assert.deepEqual(config, {
      appId: 'stored_app',
      appSecret: 'stored_secret',
      mode: 'current',
      dataDir: '/tmp/from-store',
      configHome: tempHome,
    });
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test('loadConfig throws when app id or secret is missing', async () => {
  const tempHome = createTempHome();

  try {
  await assert.rejects(
    () =>
      loadConfig({
        settings: {},
        env: {
          CODEX_FEISHU_HOME: tempHome,
        },
      }),
    ConfigError,
  );
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});
