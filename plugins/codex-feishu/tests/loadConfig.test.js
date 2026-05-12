import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ConfigError,
  loadConfig,
} from '../src/config/loadConfig.js';

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
  });
});

test('loadConfig falls back to environment variables', async () => {
  const config = await loadConfig({
    settings: {},
    env: {
      FEISHU_APP_ID: 'cli_env',
      FEISHU_APP_SECRET: 'secret_env',
      CODEX_FEISHU_MODE: 'background',
      CODEX_FEISHU_DATA_DIR: '/tmp/from-env',
    },
  });

  assert.deepEqual(config, {
    appId: 'cli_env',
    appSecret: 'secret_env',
    mode: 'background',
    dataDir: '/tmp/from-env',
  });
});

test('loadConfig throws when app id or secret is missing', async () => {
  await assert.rejects(
    () =>
      loadConfig({
        settings: {},
        env: {},
      }),
    ConfigError,
  );
});
